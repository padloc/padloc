/* global padlock, store */
padlock.pay = (function() {
    "use strict";

    padlock.ERR_PAY_SERVER_ERROR;
    padlock.ERR_PAY_INVALID_RECEIPT;

    var monthlyId = "padlock_cloud_monthly";
    var dispatcher = document.createElement("div");
    var account;
    var refreshed = false;

    document.addEventListener("deviceready", function() {
        store.register({
            id:    monthlyId,
            alias: "Padlock Cloud Monthly",
            type:  store.PAID_SUBSCRIPTION
        });
    });

    function validate(email, success, fail, product) {
        var req = new XMLHttpRequest();

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                if (req.status.toString()[0] == "2") {
                    store.get(monthlyId).finish();
                    success();
                } else {
                    try {
                        var resp = JSON.parse(req.responseText);
                        if (resp.error == "invalid_receipt") {
                            fail(padlock.ERR_PAY_INVALID_RECEIPT);
                        } else {
                            fail(padlock.ERR_PAY_SERVER_ERROR);
                        }
                    } catch(e) {
                        fail(padlock.ERR_PAY_SERVER_ERROR);
                    }
                }
            }
        };

        req.open("POST", "http://192.168.3.151:3000/validatereceipt/", true);
        req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        req.send(
            "email=" + encodeURIComponent(account) +
            "&type=" + encodeURIComponent(product.transaction.type) +
            "&receipt=" + encodeURIComponent(product.transaction.transactionReceipt)
        );
    }

    function hasSubscription(cb) {
        if (typeof store === "undefined") {
            return cb(false);
        }

        refresh(function() {
            var product = store.get(monthlyId);
            cb(product.state == store.OWNED || product.state == store.APPROVED);
        });
    }

    function verifySubscription(email, success, fail) {
        if (typeof store === "undefined") {
            dispatcher.dispatchEvent(new CustomEvent("verified"));
            return;
        }
        // store.refresh();
        account = email;
        store.validator = validate.bind(null, email, success, fail);
        refresh(function() {
            store.get(monthlyId).verify();
        });
    }

    function orderSubscription(email, success, fail) {
        if (typeof store === "undefined") {
            dispatcher.dispatchEvent(new CustomEvent("purchased"));
            return;
        }
        refresh(function() {
            store.once(monthlyId, "approved", function() {
                verifySubscription(email, success, fail);
            });
            store.order(monthlyId);
        });
    }

    function getProductInfo(cb) {
        if (typeof store === "undefined") {
            return {
                description: "Padlock Cloud provides a convenient way of synchronising your " +
                    "data between all your devices by securely storing it in the cloud.",
                price: "$2.49"
            };
        }

        refresh(function() {
            cb(store.get(monthlyId));
        });
    }

    function refresh(cb) {
        if (refreshed) {
            cb();
        } else {
            store.once(monthlyId, "updated", function() {
                refreshed = true;
                cb();
            });
            store.refresh();
        }
    }

    return {
        orderSubscription: orderSubscription,
        hasSubscription: hasSubscription,
        verifySubscription: verifySubscription,
        getProductInfo: getProductInfo,
        addEventListener: dispatcher.addEventListener.bind(dispatcher),
        removeEventListenert: dispatcher.removeEventListener.bind(dispatcher),
        refresh: refresh
    };
})();

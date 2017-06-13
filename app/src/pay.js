/* global padlock, store */
padlock.pay = (function() {
    "use strict";

    padlock.ERR_PAY_SERVER_ERROR = "Padlock Pay Server Error";
    padlock.ERR_PAY_INVALID_RECEIPT = "Padlock Pay Invalid Receipt";

    var monthlyId = "padlock_cloud_monthly";
    var refreshed = false;

    document.addEventListener("deviceready", function() {
        store.register({
            id:    monthlyId,
            alias: "Padlock Cloud Monthly",
            type:  store.PAID_SUBSCRIPTION
        });
    });

    // Validation function for purchase receipts
    function validate(server, email, success, fail, product) {
        var req = new XMLHttpRequest();

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                if (req.status.toString()[0] == "2") {
                    // Request was successful. Finish purchase and call success callback
                    store.get(monthlyId).finish();
                    success();
                } else {
                    // Handle error
                    try {
                        var resp = JSON.parse(req.responseText);
                        if (resp.error == "invalid_receipt") {
                            fail(padlock.ERR_PAY_INVALID_RECEIPT);
                        } else {
                            fail(padlock.CloudSource.errFromStatus(req.status));
                        }
                    } catch (e) {
                        fail(padlock.CloudSource.errFromStatus(req.status));
                    }
                }
            }
        };

        try {
            // send receipt data to padlock cloud server
            req.open("POST", server + "/validatereceipt/", true);
            req.setRequestHeader("Accept", "application/vnd.padlock;version=1");
            req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            req.send(
                "email=" + encodeURIComponent(email) +
                "&type=" + encodeURIComponent(product.transaction.type) +
                "&receipt=" + encodeURIComponent(product.transaction.transactionReceipt)
            );
        } catch(e) {
            fail(padlock.ERR_PAY_SERVER_ERROR);
        }
    }

    // checks if a user has an active subscription
    function hasSubscription(cb) {
        refresh(function() {
            var product = store.get(monthlyId);
            cb(product.state == store.OWNED || product.state == store.APPROVED);
        });
    }

    // Verifies the current purchase
    function verifySubscription(server, email, success, fail) {
        store.validator = validate.bind(null, server, email, success, fail);
        refresh(function() {
            store.get(monthlyId).verify();
        });
    }

    // Initiates a purchase
    function orderSubscription(server, email, success, fail) {
        refresh(function() {
            store.once(monthlyId, "approved", function() {
                verifySubscription(server, email, success, fail);
            });
            store.order(monthlyId);
        });
    }

    // Fetches the product info for the padlock cloud subscription
    function getProductInfo(cb) {
        refresh(function() {
            cb(store.get(monthlyId));
        });
    }

    // Calls `store.refresh` if that hasn't happened yet. Otherwise does nothing.
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
        refresh: refresh
    };
})();

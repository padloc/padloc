/* global padlock, store */
padlock.pay = (function() {
    "use strict";

    var monthlyId = "padlock_cloud_monthly";
    var dispatcher = document.createElement("div");
    var account;

    document.addEventListener("deviceready", function() {
        store.register({
            id:    monthlyId,
            alias: "Padlock Cloud Monthly",
            type:  store.PAID_SUBSCRIPTION
        });

        store.when("padlock_cloud_monthly").approved(function() {
            // console.log("approved:\n" + JSON.stringify(product, null, 2));
            dispatcher.dispatchEvent(new CustomEvent("purchased"));
        });

        store.validator = function(product) {
            var req = new XMLHttpRequest();

            req.onreadystatechange = function() {
                if (req.readystate === 4) {
                    if (req.status.toString()[0] == "2") {
                        dispatcher.dispatchEvent(new CustomEvent("verified"));
                    }
                }
            };

            req.open("POST", "http://172.20.10.2:3000/validatereceipt/", true);
            req.send(
                "email=" + encodeURIComponent(account) +
                "&type=" + encodeURIComponent(product.transaction.type) +
                "&receipt=" + encodeURIComponent(product.transaction.transactionReceipt)
            );
        };
    });

    function hasSubscription() {
        if (typeof store === "undefined") {
            return false;
        }
        store.refresh();
        var product = store.get(monthlyId);
        return product.state == store.OWNED || product.state == store.APPROVED;
    }

    function verifySubscription(email) {
        if (typeof store === "undefined") {
            dispatcher.dispatchEvent(new CustomEvent("verified"));
            return;
        }
        store.refresh();
        account = email;
        store.get(monthlyId).verify();
    }

    function orderSubscription(email) {
        if (typeof store === "undefined") {
            dispatcher.dispatchEvent(new CustomEvent("purchased"));
            return;
        }
        store.refresh();
        account = email;
        store.order(monthlyId);
    }

    function getProductInfo() {
        if (typeof store === "undefined") {
            return {
                description: "Padlock Cloud provides a convenient way of synchronising your data between all your devices by securely storing it in the cloud.",
                price: "$2.49"
            };
        }

        store.refresh();
        return store.get(monthlyId);
    }

    return {
        orderSubscription: orderSubscription,
        hasSubscription: hasSubscription,
        verifySubscription: verifySubscription,
        getProductInfo: getProductInfo,
        addEventListener: dispatcher.addEventListener.bind(dispatcher),
        removeEventListenert: dispatcher.removeEventListener.bind(dispatcher)
    };
})();

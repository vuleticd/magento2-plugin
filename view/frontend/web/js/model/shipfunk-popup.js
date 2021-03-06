/**
 * Copyright © 2016 Magento. All rights reserved.
 * See COPYING.txt for license details.
 */
/*jshint browser:true jquery:true*/
/*global alert*/
define(
    [
        'jquery',
        'ko',
        'Magento_Ui/js/modal/modal',
        'Magento_Checkout/js/checkout-data',
        'Magento_Checkout/js/model/quote',
        'Magento_Customer/js/model/address-list',
        'Magento_Ui/js/modal/alert',
        'mage/translate'
    ],
    function ($, ko, modal, checkoutData, quote, addressList, alert, $t) {
        'use strict';
        var carrierData = ko.observable();
        var carriercode = ko.observable();
        var productcode = ko.observable();
        var product_description = ko.observable();
        var price = ko.observable();
        var selectedPickup = ko.observable(false);
        var shippingPoints = ko.observableArray([]);

        return {
            modalWindow: null,

            /** Create popUp window for provided element */
            createPopUp: function (element) {
                this.modalWindow = element;
                var options = {
                    'type': 'popup',
                    'modalClass': 'popup-shipfunk',
                    'responsive': true,
                    'innerScroll': true,
                    'buttons': []
                };
                modal(options, $(this.modalWindow));
            },

            showModal: function () {
                $(this.modalWindow).modal('openModal');
            },

            hideModal: function () {
                $(this.modalWindow).modal('closeModal');
            },

            setCarrierData: function (method) {
                var self = this;
                var methodCodeArray = method.method_code.split('_');

                if (!checkoutData.getSelectedShippingRate()) {
                    return;
                }

                var address = quote.shippingAddress(); // this alone should be safe bet
                if (!address) {
                    address = checkoutData.getShippingAddressFromData();
                }

                carriercode(methodCodeArray[1]);
                carriercode.valueHasMutated();
                productcode(methodCodeArray[2]);
                productcode.valueHasMutated();
                price(method.amount);
                price.valueHasMutated();

                product_description(method.extension_attributes.method_description);
                product_description.valueHasMutated();

                var sf_returntype = "json";
                var sf_thisorderid = window.checkoutConfig.quoteItemData[0].quote_id;
                var sf_webshopid = window.shipfunkPopup.webshopid;
                var sf_language_code = "EN";
                var sf_country = address.countryId ? address.countryId : address.country_id;
                $.ajax({
                    type: "GET",
                    url: window.shipfunkPopup.apiUrl + "getpickups/" + methodCodeArray[1] + "/" + address.postcode + "/" + sf_returntype + "/" + sf_webshopid + "/" + sf_thisorderid + "/" + sf_country + "/" + sf_language_code,
                    timeout: 5000, // 5 second timeout in millis!
                    dataType: "jsonp",
                    success: function (data, textStatus, jqXHR) {

                        var resp = $.parseJSON(data);
                        var response = resp.response;

                        self.storePickupPoints(response);

                        if (response !== undefined && response.length) {
                            self.showModal();
                            // display only 1st 5 points
                            response = response.slice(0, 15);
                            shippingPoints(response);
                        }
                        else {
                            shippingPoints(null);
                            self.hideModal();
                        }
                        shippingPoints.valueHasMutated();
                        $('#shipfunkPickup').html('');

                    }
                });

                console.debug('done');
            },

            selectPickupPoint: function (point) {
                var self = this;
                var selectedData = {
                    query: {
                        selected_option: {
                            carriercode: carriercode(),
                            productcode: productcode(),
                            pickupid: point.pickup_id,
                            orderid: window.checkoutConfig.quoteItemData[0].quote_id,
                            webshopid: window.shipfunkPopup.webshopid,
                            realprice: price(),
                            discountedprice: price(),
                            return_prices: "1"
                        }
                    }
                };
                $.ajax({
                    type: "GET",
                    url: window.shipfunkPopup.apiUrl + "selected_delivery/json/json",
                    timeout: 5000, // 5 second timeout in millis!
                    data: {'sf_selected': JSON.stringify(selectedData)},
                    dataType: "jsonp",
                    success: function (data, textStatus, jqXHR) {
                        selectedPickup(point.pickup_id);
                        self.selectPickupPointLocation(point);
                        //self.hideModal();
                    },
                    error: function (jqXHR, textStatus) {
                        alert({
                            content: $t("Something went wrong")
                        });
                    }
                });
                $.ajax({
                    type: "POST",
                    url: "/shipfunk/index/index",
                    timeout: 5000, // 5 second timeout in millis!
                    data: {'data': selectedData},
                    dataType: "json",
                    success: function (data, textStatus, jqXHR) {
                    },
                    error: function (jqXHR, textStatus) {
                        alert({
                            content: $t("Something went wrong while storing the pickup points")
                        });
                    }
                });
            },

            storePickupPoints: function (pickups) {
                var data = ['insert', carriercode(), productcode(), pickups];
                $.ajax({
                    type: "POST",
                    url: "/shipfunk/index/index",
                    timeout: 5000, // 5 second timeout in millis!
                    data: {'data': data},
                    dataType: "json",
                    success: function (data, textStatus, jqXHR) {
                    },
                    error: function (jqXHR, textStatus) {
                        alert({
                            content: $t("Something went wrong while storing the pickup points")
                        });
                    }
                });
            },
            removeShipping: function () {
                console.debug('remove');
                var data = ['delete', window.checkoutConfig.quoteItemData[0].quote_id];
                $.ajax({
                    type: "POST",
                    url: "/shipfunk/index/index",
                    timeout: 5000, // 5 second timeout in millis!
                    data: {'data': data},
                    dataType: "json",
                    success: function (data, textStatus, jqXHR) {
                    },
                    error: function (jqXHR, textStatus) {
                        alert({
                            content: $t("Something went wrong while storing the pickup points")
                        });
                    }
                });

            },
            selectPickupPointLocation: function (pickup) {

                var self = this;
                var data = '<b>Selected Pickup Location</b>' +
                    '<br />' + pickup.pickup_name + '' +
                    '<br />' + pickup.pickup_addr + '' +
                    '<br />' + pickup.pickup_postal + ' ' + pickup.pickup_city;
                $('#shipfunkPickup').html(data).prependTo('#opc-shipping_method');

                self.hideModal();
            },

            selectDelivery: function () {
                var selectedData = {
                    query: {
                        selected_option: {
                            carriercode: carriercode(),
                            productcode: productcode(),
                            pickupid: '',
                            orderid: window.checkoutConfig.quoteItemData[0].quote_id,
                            webshopid: window.shipfunkPopup.webshopid,
                            realprice: price(),
                            discountedprice: price(),
                            return_prices: "1"
                        }
                    }
                };

                $.ajax({
                    type: "GET",
                    url: window.shipfunkPopup.apiUrl + "selected_delivery/json/json",
                    timeout: 5000, // 5 second timeout in millis!
                    data: {'sf_selected': JSON.stringify(selectedData)},
                    dataType: "jsonp",
                    success: function (data, textStatus, jqXHR) {
                        //console.debug("selected: "+data);
                    },
                    error: function (jqXHR, textStatus) {
                        alert({
                            content: $t("Something went wrong test")
                        });
                    }
                });
            },

            getShippingPoints: function () {
                return shippingPoints;
            },

            getCarrierData: function () {
                return carrierData;
            },

            getCarrierCode: function () {
                return carriercode;
            },

            getProductCode: function () {
                return productcode;
            },

            getSelectedPickup: function () {
                return selectedPickup;
            },

            getProductDescription: function () {
                return product_description;
            },

            getPrice: function () {
                return price;
            }
        }
    }
);

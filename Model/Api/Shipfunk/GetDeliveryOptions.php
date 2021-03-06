<?php

namespace Nord\Shipfunk\Model\Api\Shipfunk;

use Magento\Framework\View\Element\Template\Context;
use Nord\Shipfunk\Model\Api\Shipfunk\Helper\AbstractApiHelper;
use Nord\Shipfunk\Model\Api\Shipfunk\Helper\CustomerHelper;
use Nord\Shipfunk\Model\Api\Shipfunk\Helper\ParcelHelper;
use Nord\Shipfunk\Helper\Data as ShipfunkDataHelper;

/**
 * Class GetDeliveryOptions
 *
 * @package Nord\Shipfunk\Model\Api\Shipfunk
 */
class GetDeliveryOptions extends AbstractApiHelper
{
    /**
     * @var ParcelHelper
     */
    protected $parcelHelper;

    /**
     * GetDeliveryOptions constructor.
     *
     * @param Context            $context
     * @param ShipfunkDataHelper $shipfunkDataHelper
     * @param CustomerHelper     $customerHelper
     * @param ParcelHelper       $parcelHelper
     */
    public function __construct(
        Context $context,
        ShipfunkDataHelper $shipfunkDataHelper,
        CustomerHelper $customerHelper,
        ParcelHelper $parcelHelper
    ) {
        parent::__construct($context, $shipfunkDataHelper, $customerHelper);

        $this->parcelHelper = $parcelHelper;
    }

    /**
     * @return \Requests_Response|string
     */
    public function getResult()
    {
        $request = $this->getRequest();
        $order   = [
            'orderid'           => $request->getAllItems()[0]->getQuoteId(),
            'order_currency'    => $request->getPackageCurrency()->getCurrencyCode(),
            'order_lang'        => $request->getDestCountryId(), // scopeConfig current locale
            'order_price'       => $request->getBaseSubtotalInclTax(),
            'order_get_pickups' => 0,
        ];

        $this->setSimpleXml();

        $this->appendToXml($this->getWebshop(), $this->simpleXml);
        $this->appendToXml($this->getCustomer(), $this->simpleXml);
        $this->appendToXml(['order' => $order], $this->simpleXml);

        $parcels = $this->getParcels();
        foreach ($parcels as $parcelCode => $parcel) {

            $this->appendToXml([
                'parcel' => [
                    'parcelCode' => $parcelCode,
                    'warehouse'  => $this->helper->getConfigData('warehouse'),
                    'weight'     => $parcel['params']['weight'],
                    'value'      => $parcel['params']['customs_value'],
                    'dimens'     =>
                        $parcel['params']['length'].'x'.
                        $parcel['params']['width'].'x'.
                        $parcel['params']['height'],
                ],
            ], $this->simpleXml, 'order');
        }

        $this->parcelHelper->setOrder($order);

        $xml = $this->simpleXml->asXML();
        $this->log->debug(var_export($xml, true));
        $result = $this->setRouteAndFieldname('get_delivoptions')->post($xml);

        return $result;
    }
}
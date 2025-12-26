
import React from 'react';
import { TemplateProps } from './types';

export const PremiumTemplate: React.FC<TemplateProps> = ({ product, settings, barcodeUrl }) => {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff',
            fontFamily: '"Times New Roman", serif', // خط كلاسيكي فاخر
            overflow: 'hidden',
            border: '4px double #000', // إطار مزدوج فاخر
            boxSizing: 'border-box',
            position: 'relative'
        }}>
            {/* Header: Black Bar */}
            {settings.showStore && (
                <div style={{
                    backgroundColor: '#000',
                    color: '#fff',
                    fontSize: '8pt',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    padding: '2px 0',
                    textAlign: 'center',
                    width: '100%',
                    letterSpacing: '2px', // تباعد أحرف للأناقة
                    fontFamily: 'sans-serif'
                }}>
                    {product.organization_name}
                </div>
            )}

            {/* Main Content Area */}
            <div style={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '3px',
                width: '100%'
            }}>

                {/* Product Name */}
                {settings.showName && (
                    <div style={{
                        fontSize: '9pt',
                        fontStyle: 'italic',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        width: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px'
                    }}>
                        {product.product_name}
                    </div>
                )}

                {/* Minimal Barcode */}
                <div style={{
                    flexGrow: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    minHeight: 0,
                    margin: '2px 0'
                }}>
                    {barcodeUrl && (
                        <img
                            src={barcodeUrl}
                            alt="Barcode"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain'
                            }}
                        />
                    )}
                </div>

                {/* Price - Elegant Large Font */}
                {settings.showPrice && (
                    <div style={{
                        fontSize: '13pt',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginBottom: '2px',
                        fontFamily: 'sans-serif'
                    }}>
                        {Number(product.product_price).toLocaleString('en-US')} <span style={{ fontSize: '0.6em' }}>DZD</span>
                    </div>
                )}
            </div>

            {/* SKU - Very subtle */}
            {settings.showSku && (
                <div style={{
                    position: 'absolute',
                    bottom: '1px',
                    right: '2px',
                    fontSize: '6px',
                    color: '#888',
                    fontFamily: 'monospace',
                    backgroundColor: '#fff',
                    padding: '0 2px'
                }}>
                    {product.product_sku}
                </div>
            )}
        </div>
    );
};


import React from 'react';
import { TemplateProps } from './types';

export const ClassicTemplate: React.FC<TemplateProps> = ({ product, settings, barcodeUrl }) => {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2mm',
            boxSizing: 'border-box',
            backgroundColor: '#fff',
            fontFamily: 'sans-serif',
            overflow: 'hidden',
            color: '#000'
        }}>
            {/* Header: Store Name */}
            {settings.showStore && (
                <div style={{
                    fontSize: '7pt',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginBottom: '2px',
                    textAlign: 'center',
                    width: '100%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    borderBottom: '1px solid #eee',
                    paddingBottom: '2px'
                }}>
                    {product.organization_name}
                </div>
            )}

            {/* Body: Product Name */}
            {settings.showName && (
                <div style={{
                    fontSize: '9pt',
                    fontWeight: '600',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    margin: '2px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    width: '100%',
                }}>
                    {product.product_name}
                </div>
            )}

            {/* Body: Barcode Image */}
            <div style={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: 0,
                overflow: 'hidden',
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

            {/* Footer: Price & SKU */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                marginTop: 'auto', // Push to bottom
                paddingTop: '3px',
                borderTop: '1px solid #000'
            }}>
                {settings.showSku && (
                    <span style={{
                        fontSize: '7pt',
                        fontFamily: 'monospace',
                        color: '#333'
                    }}>
                        {product.product_sku}
                    </span>
                )}

                {settings.showPrice && (
                    <span style={{
                        fontSize: '11pt',
                        fontWeight: '900',
                        marginLeft: 'auto', // Push to right irrespective of SKU presence
                        display: 'block',
                        width: settings.showSku ? 'auto' : '100%',
                        textAlign: settings.showSku ? 'right' : 'center'
                    }}>
                        {Number(product.product_price).toLocaleString('en-US')} <span style={{ fontSize: '7pt' }}>DA</span>
                    </span>
                )}
            </div>
        </div>
    );
};

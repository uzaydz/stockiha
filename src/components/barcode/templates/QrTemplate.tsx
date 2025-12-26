
import React from 'react';
import { TemplateProps } from './types';

export const QrTemplate: React.FC<TemplateProps> = ({ product, settings, barcodeUrl, qrCodeUrl }) => {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '0.8mm', // هوامش ضيقة جداً لتوفير المساحة
            boxSizing: 'border-box',
            backgroundColor: '#fff',
            fontFamily: '"Tajawal", "Segoe UI", sans-serif',
            overflow: 'hidden',
            color: '#000'
        }}>
            {/* Header Name (Top) */}
            {settings.showStore && (
                <div style={{
                    fontSize: '6pt',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    borderBottom: '0.5px solid #eaeaea',
                    marginBottom: '0.5mm',
                    paddingBottom: '0.5mm',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textTransform: 'uppercase'
                }}>
                    {product.organization_name}
                </div>
            )}

            <div style={{
                display: 'flex',
                flexDirection: 'row',
                flexGrow: 1,
                gap: '1mm',
                minHeight: 0, // مهم جداً لمنع التمدد الزائد
                alignItems: 'center'
            }}>
                {/* Left: QR Code (Fixed ratio) */}
                {qrCodeUrl && (
                    <div style={{
                        width: '32%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center', // توسيط عمودي
                        alignItems: 'center',
                        backgroundColor: '#fff'
                    }}>
                        <img
                            src={qrCodeUrl}
                            style={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                display: 'block'
                            }}
                        />
                    </div>
                )}

                {/* Right: Details + Barcode */}
                <div style={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    width: '66%', // باقي المساحة
                    height: '100%',
                    paddingLeft: '0.5mm'
                }}>
                    {/* Product Name - Top Right */}
                    {settings.showName && (
                        <div style={{
                            fontSize: '7.5pt',
                            fontWeight: '700',
                            lineHeight: '1.1',
                            marginBottom: '0.5mm',
                            textAlign: 'right', // محاذاة لليمين للغة العربية
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: '0'
                        }}>
                            {product.product_name}
                        </div>
                    )}

                    {/* Minimal Barcode - Middle */}
                    <div style={{
                        flexGrow: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 0,
                        margin: '0.5mm 0'
                    }}>
                        {barcodeUrl && (
                            <img
                                src={barcodeUrl}
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    maxHeight: '100%',
                                    objectFit: 'contain'
                                }}
                            />
                        )}
                    </div>

                    {/* Price - Bottom Right */}
                    {settings.showPrice && (
                        <div style={{
                            fontSize: '10pt',
                            fontWeight: '900',
                            textAlign: 'center',
                            color: '#000',
                            whiteSpace: 'nowrap'
                        }}>
                            {Number(product.product_price).toLocaleString()} <span style={{ fontSize: '0.6em' }}>DA</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Optional SKU Footer */}
            {settings.showSku && (
                <div style={{
                    fontSize: '5pt',
                    textAlign: 'center',
                    color: '#666',
                    marginTop: '0.5mm',
                    fontFamily: 'monospace'
                }}>
                    {product.product_sku}
                </div>
            )}
        </div>
    );
};

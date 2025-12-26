/**
 * P2P Cart Service - خدمة نقل السلة بين الأجهزة
 *
 * تدعم طريقتين:
 * 1. QR Code مباشر (للسلات الصغيرة < 2KB)
 * 2. WebRTC P2P (للسلات الكبيرة والاتصال المستمر)
 */

import LZString from 'lz-string';

// أنواع البيانات
export interface CartTransferItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  // المتغيرات
  colorId?: string;
  colorName?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  // أنواع البيع
  sellingUnit?: 'piece' | 'weight' | 'box' | 'meter';
  weight?: number;
  weightUnit?: 'kg' | 'g';
  boxCount?: number;
  length?: number;
  // الدفعات والأرقام التسلسلية
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers?: string[];
  // نوع البيع (جملة/تجزئة)
  saleType?: 'retail' | 'wholesale' | 'partial_wholesale';
  // السعر المخصص
  customPrice?: number;
  // صورة المنتج
  productImage?: string;
}

export interface CartTransferData {
  version: number;
  timestamp: number;
  items: CartTransferItem[];
  customerId?: string;
  customerName?: string;
  notes?: string;
}

export interface P2PConnectionState {
  status: 'idle' | 'waiting' | 'connecting' | 'connected' | 'error';
  roomCode?: string;
  error?: string;
  peerId?: string;
}

// تكوين STUN servers للمساعدة في اكتشاف IP
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

/**
 * خدمة نقل السلة P2P
 */
class P2PCartService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onCartReceivedCallback: ((cart: CartTransferData) => void) | null = null;
  private onConnectionStateChangeCallback: ((state: P2PConnectionState) => void) | null = null;
  private connectionState: P2PConnectionState = { status: 'idle' };

  // ==================== QR Code Methods (Simple) ====================

  /**
   * تحويل السلة إلى نص مضغوط للـ QR Code
   */
  encodeCartForQR(cart: CartTransferData): string {
    const jsonString = JSON.stringify(cart);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    return `CART:${compressed}`;
  }

  /**
   * فك تشفير السلة من نص QR Code
   */
  decodeCartFromQR(qrData: string): CartTransferData | null {
    try {
      if (!qrData.startsWith('CART:')) {
        throw new Error('Invalid cart QR code format');
      }

      const compressed = qrData.substring(5); // Remove "CART:" prefix
      const jsonString = LZString.decompressFromEncodedURIComponent(compressed);

      if (!jsonString) {
        throw new Error('Failed to decompress cart data');
      }

      const cart = JSON.parse(jsonString) as CartTransferData;

      // التحقق من صحة البيانات
      if (!cart.version || !cart.items || !Array.isArray(cart.items)) {
        throw new Error('Invalid cart data structure');
      }

      return cart;
    } catch (error) {
      console.error('Error decoding cart from QR:', error);
      return null;
    }
  }

  /**
   * تحويل عناصر السلة الحالية إلى صيغة النقل
   */
  prepareCartForTransfer(
    cartItems: any[],
    customerId?: string,
    customerName?: string,
    notes?: string
  ): CartTransferData {
    const items: CartTransferItem[] = cartItems.map(item => ({
      productId: item.product?.id || item.productId || item.id,
      productName: item.product?.name || item.productName || 'منتج',
      quantity: item.quantity || 1,
      price: item.customPrice ?? item.variantPrice ?? item.product?.price ?? item.price ?? 0,
      // المتغيرات
      colorId: item.colorId,
      colorName: item.colorName,
      sizeId: item.sizeId,
      sizeName: item.sizeName,
      variantPrice: item.variantPrice,
      // أنواع البيع
      sellingUnit: item.sellingUnit || 'piece',
      weight: item.weight,
      weightUnit: item.weightUnit,
      boxCount: item.boxCount,
      length: item.length,
      // الدفعات والأرقام التسلسلية
      batchId: item.batchId,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      serialNumbers: item.serialNumbers,
      // نوع البيع
      saleType: item.saleType,
      // السعر المخصص
      customPrice: item.customPrice,
      // صورة المنتج (مصغرة للحجم)
      productImage: item.product?.thumbnail_base64 || item.product?.thumbnail_image,
    }));

    return {
      version: 1,
      timestamp: Date.now(),
      items,
      customerId,
      customerName,
      notes,
    };
  }

  /**
   * حساب حجم البيانات المضغوطة
   */
  getEncodedSize(cart: CartTransferData): number {
    return this.encodeCartForQR(cart).length;
  }

  /**
   * التحقق مما إذا كانت السلة تناسب QR Code واحد
   */
  canFitInSingleQR(cart: CartTransferData): boolean {
    // QR Code يمكنه حمل حوالي 3000 حرف بجودة معقولة
    return this.getEncodedSize(cart) < 2500;
  }

  // ==================== WebRTC P2P Methods (Advanced) ====================

  /**
   * إنشاء غرفة جديدة (للمستقبِل - الحاسوب)
   */
  async createRoom(): Promise<string> {
    this.updateState({ status: 'waiting' });

    try {
      // إنشاء اتصال جديد
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

      // إنشاء قناة البيانات
      this.dataChannel = this.peerConnection.createDataChannel('cart-transfer', {
        ordered: true,
      });

      this.setupDataChannel(this.dataChannel);

      // جمع ICE candidates
      const iceCandidates: RTCIceCandidate[] = [];

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          iceCandidates.push(event.candidate);
        }
      };

      // إنشاء العرض
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // انتظار جمع ICE candidates
      await new Promise<void>((resolve) => {
        this.peerConnection!.onicegatheringstatechange = () => {
          if (this.peerConnection!.iceGatheringState === 'complete') {
            resolve();
          }
        };
        // Timeout بعد 5 ثواني
        setTimeout(resolve, 5000);
      });

      // إنشاء كود الغرفة (يحتوي على SDP + ICE candidates)
      const roomData = {
        type: 'offer',
        sdp: this.peerConnection.localDescription,
        candidates: iceCandidates.slice(0, 5), // أول 5 candidates فقط
      };

      const roomCode = LZString.compressToEncodedURIComponent(JSON.stringify(roomData));

      this.updateState({ status: 'waiting', roomCode: `P2P:${roomCode}` });

      return `P2P:${roomCode}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ status: 'error', error: errorMessage });
      throw error;
    }
  }

  /**
   * الانضمام لغرفة (للمُرسِل - الهاتف)
   */
  async joinRoom(roomCode: string): Promise<string> {
    this.updateState({ status: 'connecting' });

    try {
      if (!roomCode.startsWith('P2P:')) {
        throw new Error('Invalid room code format');
      }

      const compressed = roomCode.substring(4);
      const roomData = JSON.parse(LZString.decompressFromEncodedURIComponent(compressed) || '');

      // إنشاء اتصال جديد
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

      // استقبال قناة البيانات
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };

      // جمع ICE candidates
      const iceCandidates: RTCIceCandidate[] = [];

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          iceCandidates.push(event.candidate);
        }
      };

      // تعيين العرض البعيد
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(roomData.sdp));

      // إضافة ICE candidates البعيدة
      for (const candidate of roomData.candidates || []) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }

      // إنشاء الرد
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // انتظار جمع ICE candidates
      await new Promise<void>((resolve) => {
        this.peerConnection!.onicegatheringstatechange = () => {
          if (this.peerConnection!.iceGatheringState === 'complete') {
            resolve();
          }
        };
        setTimeout(resolve, 5000);
      });

      // إنشاء كود الرد
      const answerData = {
        type: 'answer',
        sdp: this.peerConnection.localDescription,
        candidates: iceCandidates.slice(0, 5),
      };

      const answerCode = LZString.compressToEncodedURIComponent(JSON.stringify(answerData));

      return `P2P-ANS:${answerCode}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ status: 'error', error: errorMessage });
      throw error;
    }
  }

  /**
   * إكمال الاتصال بعد استلام الرد (للمستقبِل)
   */
  async completeConnection(answerCode: string): Promise<void> {
    try {
      if (!answerCode.startsWith('P2P-ANS:')) {
        throw new Error('Invalid answer code format');
      }

      const compressed = answerCode.substring(8);
      const answerData = JSON.parse(LZString.decompressFromEncodedURIComponent(compressed) || '');

      // تعيين الرد البعيد
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(answerData.sdp));

      // إضافة ICE candidates البعيدة
      for (const candidate of answerData.candidates || []) {
        await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate));
      }

      this.updateState({ status: 'connected' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ status: 'error', error: errorMessage });
      throw error;
    }
  }

  /**
   * إرسال السلة عبر WebRTC
   */
  sendCart(cart: CartTransferData): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error('Data channel not ready');
      return false;
    }

    try {
      const message = JSON.stringify({
        type: 'cart',
        data: cart,
      });

      this.dataChannel.send(message);
      return true;
    } catch (error) {
      console.error('Error sending cart:', error);
      return false;
    }
  }

  /**
   * تسجيل callback لاستقبال السلة
   */
  onCartReceived(callback: (cart: CartTransferData) => void): void {
    this.onCartReceivedCallback = callback;
  }

  /**
   * تسجيل callback لتغيير حالة الاتصال
   */
  onConnectionStateChange(callback: (state: P2PConnectionState) => void): void {
    this.onConnectionStateChangeCallback = callback;
  }

  /**
   * إغلاق الاتصال
   */
  disconnect(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.updateState({ status: 'idle' });
  }

  /**
   * الحصول على حالة الاتصال الحالية
   */
  getConnectionState(): P2PConnectionState {
    return this.connectionState;
  }

  // ==================== Private Methods ====================

  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log('P2P Data channel opened');
      this.updateState({ status: 'connected' });
    };

    channel.onclose = () => {
      console.log('P2P Data channel closed');
      this.updateState({ status: 'idle' });
    };

    channel.onerror = (error) => {
      console.error('P2P Data channel error:', error);
      this.updateState({ status: 'error', error: 'Connection error' });
    };

    channel.onmessage = (event) => {
      const raw = event.data;
      setTimeout(() => {
        try {
          const message = JSON.parse(raw);

          if (message.type === 'cart' && this.onCartReceivedCallback) {
            this.onCartReceivedCallback(message.data);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }, 0);
    };
  }

  private updateState(newState: Partial<P2PConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...newState };

    if (this.onConnectionStateChangeCallback) {
      this.onConnectionStateChangeCallback(this.connectionState);
    }
  }
}

// تصدير instance واحد
export const p2pCartService = new P2PCartService();
export default p2pCartService;

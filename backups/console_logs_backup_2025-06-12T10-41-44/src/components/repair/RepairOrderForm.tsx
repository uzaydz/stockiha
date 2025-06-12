import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { Button, Form, Input, Select, InputNumber, Upload, message } from 'antd';
import { UploadOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import TextArea from 'antd/lib/input/TextArea';
import { supabase } from '@/lib/supabase';

const { Option } = Select;

interface RepairLocation {
  id: string;
  name: string;
}

interface RepairOrderFormProps {
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
}

const RepairOrderForm: React.FC<RepairOrderFormProps> = ({ onSuccess, onCancel }) => {
  const { user, organizationId } = useUser();
  const [form] = Form.useForm();
  const [repairLocations, setRepairLocations] = useState<RepairLocation[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // جلب قائمة أماكن التصليح
  useEffect(() => {
    const fetchRepairLocations = async () => {
      if (!organizationId) return;

      const { data, error } = await supabase
        .from('repair_locations')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) {
        message.error('فشل في جلب أماكن التصليح');
        return;
      }

      setRepairLocations(data || []);
    };

    fetchRepairLocations();
  }, [organizationId]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // إنشاء معرّف فريد للطلبية
      const repairOrderId = uuidv4();

      // إعداد بيانات الطلبية
      const repairOrderData = {
        id: repairOrderId,
        organization_id: organizationId,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        repair_location_id: values.repair_location === 'أخرى' ? null : values.repair_location,
        custom_location: values.repair_location === 'أخرى' ? values.custom_location : null,
        issue_description: values.issue_description,
        repair_images: [], // سيتم تحديثه بعد رفع الصور
        total_price: values.total_price,
        paid_amount: values.paid_amount || 0,
        payment_method: values.payment_method,
        received_by: user?.id,
        status: 'قيد الانتظار',
      };

      // إدراج الطلبية في قاعدة البيانات
      const { error: insertError } = await supabase
        .from('repair_orders')
        .insert(repairOrderData);

      if (insertError) {
        throw new Error(`فشل في إضافة طلبية التصليح: ${insertError.message}`);
      }

      // رفع الصور إذا كانت موجودة
      if (fileList.length > 0) {
        const imagePromises = fileList.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${repairOrderId}/${uuidv4()}.${fileExt}`;
          const filePath = `repair_images/${fileName}`;

          // رفع الملف إلى التخزين
          const { error: uploadError } = await supabase.storage
            .from('repair_images')
            .upload(filePath, file.originFileObj);

          if (uploadError) {
            throw new Error(`فشل في رفع الصورة: ${uploadError.message}`);
          }

          // الحصول على رابط عام للصورة
          const { data: urlData } = await supabase.storage
            .from('repair_images')
            .getPublicUrl(filePath);

          // إضافة الصورة إلى جدول صور التصليح
          const imageData = {
            repair_order_id: repairOrderId,
            image_url: urlData.publicUrl,
            image_type: 'before',
            description: 'صورة قبل التصليح'
          };

          const { error: imageInsertError } = await supabase
            .from('repair_images')
            .insert(imageData);

          if (imageInsertError) {
            throw new Error(`فشل في تسجيل بيانات الصورة: ${imageInsertError.message}`);
          }

          return urlData.publicUrl;
        });

        // انتظار اكتمال رفع جميع الصور
        await Promise.all(imagePromises);
      }

      message.success('تم إضافة طلبية التصليح بنجاح');
      
      // استدعاء دالة النجاح مع معرّف الطلبية
      onSuccess(repairOrderId);
      
      // إعادة تعيين النموذج
      form.resetFields();
      setFileList([]);
    } catch (error: any) {
      message.error(error.message || 'حدث خطأ أثناء إضافة طلبية التصليح');
    } finally {
      setLoading(false);
    }
  };

  const normFile = (e: any) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  const beforeUpload = (file: any) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('يمكنك رفع ملفات الصور فقط!');
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('يجب أن يكون حجم الصورة أقل من 5 ميجابايت!');
    }
    return isImage && isLt5M;
  };

  const handleFileChange = ({ fileList }: any) => {
    setFileList(fileList);
  };

  return (
    <div className="repair-order-form">
      <h2>إضافة طلبية تصليح جديدة</h2>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          payment_method: 'نقدًا',
          paid_amount: 0
        }}
      >
        {/* معلومات العميل */}
        <div className="form-section">
          <h3>معلومات العميل</h3>
          <Form.Item
            name="customer_name"
            label="اسم العميل"
            rules={[{ required: true, message: 'الرجاء إدخال اسم العميل' }]}
          >
            <Input placeholder="أدخل اسم العميل" />
          </Form.Item>

          <Form.Item
            name="customer_phone"
            label="رقم الهاتف"
            rules={[
              { required: true, message: 'الرجاء إدخال رقم الهاتف' },
              { pattern: /^\d{10}$/, message: 'رقم الهاتف يجب أن يتكون من 10 أرقام' }
            ]}
          >
            <Input placeholder="أدخل رقم الهاتف" />
          </Form.Item>
        </div>

        {/* معلومات التصليح */}
        <div className="form-section">
          <h3>معلومات التصليح</h3>
          <Form.Item
            name="repair_location"
            label="مكان التصليح"
            rules={[{ required: true, message: 'الرجاء اختيار مكان التصليح' }]}
          >
            <Select placeholder="اختر مكان التصليح">
              {repairLocations.map(location => (
                <Option key={location.id} value={location.id}>
                  {location.name}
                </Option>
              ))}
              <Option value="الورشة">الورشة</Option>
              <Option value="المخزن">المخزن</Option>
              <Option value="الواجهة">الواجهة</Option>
              <Option value="أخرى">أخرى</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.repair_location !== currentValues.repair_location
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('repair_location') === 'أخرى' ? (
                <Form.Item
                  name="custom_location"
                  label="حدد مكان التصليح"
                  rules={[{ required: true, message: 'الرجاء تحديد مكان التصليح' }]}
                >
                  <Input placeholder="أدخل مكان التصليح" />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="issue_description"
            label="وصف العطل"
          >
            <TextArea
              placeholder="أدخل وصف العطل"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>

          <Form.Item
            name="repair_images"
            label="صور للجهاز"
            valuePropName="fileList"
            getValueFromEvent={normFile}
          >
            <Upload
              listType="picture"
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={handleFileChange}
              customRequest={({ onSuccess }) => {
                if (onSuccess) onSuccess('ok');
              }}
            >
              <Button icon={<UploadOutlined />}>إضافة صور</Button>
            </Upload>
          </Form.Item>
        </div>

        {/* معلومات الدفع */}
        <div className="form-section">
          <h3>معلومات الدفع</h3>
          <Form.Item
            name="total_price"
            label="سعر التصليح الكلي"
            rules={[{ required: true, message: 'الرجاء إدخال سعر التصليح' }]}
          >
            <InputNumber
              min={0}
              step={100}
              style={{ width: '100%' }}
              placeholder="أدخل السعر الكلي"
            />
          </Form.Item>

          <Form.Item
            name="paid_amount"
            label="المبلغ المدفوع الآن"
            initialValue={0}
          >
            <InputNumber
              min={0}
              step={100}
              style={{ width: '100%' }}
              placeholder="أدخل المبلغ المدفوع"
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.total_price !== currentValues.total_price ||
              prevValues.paid_amount !== currentValues.paid_amount
            }
          >
            {({ getFieldValue }) => {
              const totalPrice = getFieldValue('total_price') || 0;
              const paidAmount = getFieldValue('paid_amount') || 0;
              const remainingAmount = totalPrice - paidAmount;
              
              return (
                <div className="remaining-amount">
                  <strong>المبلغ المتبقي:</strong> {remainingAmount} دج
                </div>
              );
            }}
          </Form.Item>

          <Form.Item
            name="payment_method"
            label="طريقة الدفع"
            rules={[{ required: true, message: 'الرجاء اختيار طريقة الدفع' }]}
          >
            <Select placeholder="اختر طريقة الدفع">
              <Option value="نقدًا">نقدًا</Option>
              <Option value="تحويل">تحويل</Option>
              <Option value="بطاقة">بطاقة</Option>
            </Select>
          </Form.Item>
        </div>

        {/* أزرار الإجراءات */}
        <div className="form-actions">
          <Button 
            type="primary" 
            htmlType="submit" 
            icon={<SaveOutlined />} 
            loading={loading}
          >
            حفظ طلبية التصليح
          </Button>
          <Button 
            onClick={onCancel} 
            icon={<CloseOutlined />}
          >
            إلغاء
          </Button>
        </div>
      </Form>

      <style jsx>{`
        .repair-order-form {
          padding: 20px;
          background: #fff;
          border-radius: 8px;
        }
        .form-section {
          margin-bottom: 24px;
          padding: 16px;
          border: 1px solid #eee;
          border-radius: 8px;
        }
        .form-section h3 {
          margin-top: 0;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f0f0f0;
        }
        .remaining-amount {
          padding: 10px;
          background-color: #f9f9f9;
          border-radius: 4px;
          margin-bottom: 16px;
          text-align: center;
        }
        .form-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
        }
      `}</style>
    </div>
  );
};

export default RepairOrderForm;

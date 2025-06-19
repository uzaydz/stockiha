import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { Table, Tag, Button, Space, Modal, message, Tooltip } from 'antd';
import { 
  EditOutlined, 
  EyeOutlined, 
  PrinterOutlined, 
  DollarOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

interface RepairOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  repair_location_id: string;
  custom_location: string;
  repair_location_name?: string;
  issue_description: string;
  total_price: number;
  paid_amount: number;
  payment_method: string;
  order_number: string;
  created_at: string;
  status: string;
  received_by: string;
  received_by_name?: string;
}

interface RepairOrderListProps {
  onView: (orderId: string) => void;
  onEdit: (orderId: string) => void;
  onNewPayment: (orderId: string) => void;
}

const RepairOrderList: React.FC<RepairOrderListProps> = ({ onView, onEdit, onNewPayment }) => {
  const { organizationId } = useUser();
  const [loading, setLoading] = useState(true);
  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([]);
  const [repairLocations, setRepairLocations] = useState<{[key: string]: string}>({});
  const [users, setUsers] = useState<{[key: string]: string}>({});

  // جلب بيانات طلبات التصليح
  useEffect(() => {
    const fetchRepairOrders = async () => {
      if (!organizationId) return;

      setLoading(true);
      try {
        // جلب طلبات التصليح
        const { data: ordersData, error: ordersError } = await supabase
          .from('repair_orders')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (ordersError) {
          throw ordersError;
        }

        // جلب أماكن التصليح
        const { data: locationsData, error: locationsError } = await supabase
          .from('repair_locations')
          .select('id, name')
          .eq('organization_id', organizationId);

        if (locationsError) {
          throw locationsError;
        }

        // جلب المستخدمين
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name')
          .eq('organization_id', organizationId);

        if (usersError) {
          throw usersError;
        }

        // تحويل البيانات إلى تنسيق خريطة سهل الاستخدام
        const locationsMap: {[key: string]: string} = {};
        locationsData.forEach((location: any) => {
          locationsMap[location.id] = location.name;
        });

        const usersMap: {[key: string]: string} = {};
        usersData.forEach((user: any) => {
          usersMap[user.id] = user.name;
        });

        // إضافة أسماء المواقع والمستخدمين إلى طلبات التصليح
        const enrichedOrders = ordersData.map((order: RepairOrder) => ({
          ...order,
          repair_location_name: order.repair_location_id 
            ? locationsMap[order.repair_location_id] 
            : (order.custom_location || 'غير محدد'),
          received_by_name: order.received_by ? usersMap[order.received_by] : 'غير معروف'
        }));

        setRepairOrders(enrichedOrders);
        setRepairLocations(locationsMap);
        setUsers(usersMap);
      } catch (error: any) {
        message.error(`فشل في جلب طلبات التصليح: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchRepairOrders();
  }, [organizationId]);

  // تحديث حالة طلبية التصليح
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('repair_orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'مكتمل' ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      // تحديث القائمة المحلية
      setRepairOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus } 
            : order
        )
      );

      message.success(`تم تحديث حالة الطلبية إلى "${newStatus}" بنجاح`);
    } catch (error: any) {
      message.error(`فشل في تحديث حالة الطلبية: ${error.message}`);
    }
  };

  // طباعة إيصال طلبية التصليح
  const printRepairOrder = (orderId: string) => {
    // سيتم تنفيذ وظيفة الطباعة هنا
    message.info('جاري تطوير ميزة الطباعة...');
  };

  // تنسيق التاريخ والوقت
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'PPpp', { locale: ar });
    } catch (error) {
      return dateStr;
    }
  };

  // لون الحالة
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'قيد الانتظار':
        return 'gold';
      case 'جاري التصليح':
        return 'blue';
      case 'مكتمل':
        return 'green';
      case 'ملغي':
        return 'red';
      default:
        return 'default';
    }
  };

  // تأكيد تغيير الحالة
  const confirmStatusChange = (orderId: string, newStatus: string) => {
    Modal.confirm({
      title: 'تأكيد تغيير الحالة',
      content: `هل أنت متأكد من تغيير حالة الطلبية إلى "${newStatus}"؟`,
      okText: 'تأكيد',
      cancelText: 'إلغاء',
      onOk: () => updateOrderStatus(orderId, newStatus)
    });
  };

  // أعمدة الجدول
  const columns = [
    {
      title: 'رقم الطلبية',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text: string) => <a>{text}</a>,
    },
    {
      title: 'اسم العميل',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: 'رقم الهاتف',
      dataIndex: 'customer_phone',
      key: 'customer_phone',
    },
    {
      title: 'مكان التصليح',
      dataIndex: 'repair_location_name',
      key: 'repair_location_name',
    },
    {
      title: 'السعر الكلي',
      dataIndex: 'total_price',
      key: 'total_price',
      render: (price: number) => `${price} دج`,
    },
    {
      title: 'المبلغ المدفوع',
      key: 'paid_amount',
      render: (text: string, record: RepairOrder) => (
        <span>
          {record.paid_amount} دج
          {record.paid_amount < record.total_price && (
            <Tooltip title="إضافة دفعة">
              <Button 
                type="link" 
                icon={<DollarOutlined />} 
                onClick={() => onNewPayment(record.id)} 
              />
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      title: 'تاريخ الاستلام',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'الموظف المستلم',
      dataIndex: 'received_by_name',
      key: 'received_by_name',
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (text: string, record: RepairOrder) => (
        <Space size="small">
          <Tooltip title="عرض التفاصيل">
            <Button 
              type="link" 
              icon={<EyeOutlined />} 
              onClick={() => onView(record.id)} 
            />
          </Tooltip>
          <Tooltip title="تعديل">
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => onEdit(record.id)} 
              disabled={record.status === 'مكتمل' || record.status === 'ملغي'}
            />
          </Tooltip>
          <Tooltip title="طباعة إيصال">
            <Button 
              type="link" 
              icon={<PrinterOutlined />} 
              onClick={() => printRepairOrder(record.id)} 
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'تغيير الحالة',
      key: 'status_actions',
      render: (text: string, record: RepairOrder) => (
        <Space size="small">
          {record.status !== 'جاري التصليح' && record.status !== 'مكتمل' && record.status !== 'ملغي' && (
            <Tooltip title="بدء التصليح">
              <Button 
                type="link" 
                icon={<ToolOutlined />} 
                onClick={() => confirmStatusChange(record.id, 'جاري التصليح')} 
              />
            </Tooltip>
          )}
          {record.status !== 'مكتمل' && record.status !== 'ملغي' && (
            <Tooltip title="إكمال التصليح">
              <Button 
                type="link" 
                icon={<CheckCircleOutlined />} 
                onClick={() => confirmStatusChange(record.id, 'مكتمل')} 
              />
            </Tooltip>
          )}
          {record.status !== 'ملغي' && (
            <Tooltip title="إلغاء الطلبية">
              <Button 
                type="link" 
                icon={<CloseCircleOutlined />} 
                onClick={() => confirmStatusChange(record.id, 'ملغي')} 
                danger
              />
            </Tooltip>
          )}
          {record.status === 'ملغي' && (
            <Tooltip title="إعادة تفعيل الطلبية">
              <Button 
                type="link" 
                icon={<SyncOutlined />} 
                onClick={() => confirmStatusChange(record.id, 'قيد الانتظار')} 
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="repair-order-list">
      <Table 
        columns={columns} 
        dataSource={repairOrders} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
      />

      <style jsx>{`
        .repair-order-list {
          background: #fff;
          padding: 20px;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
};

export default RepairOrderList;

import React, { useState, useEffect } from 'react';
import { Table, DatePicker, Card, Statistic, Space } from 'antd';
import moment from 'moment';

const { RangePicker } = DatePicker;

const PaidServicesCost = ({ childId }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([moment().startOf('month'), moment().endOf('month')]);
  const [totalCost, setTotalCost] = useState(0);

  const columns = [
    {
      title: 'Услуга',
      dataIndex: 'serviceName',
      key: 'serviceName',
    },
    {
      title: 'Количество посещений',
      dataIndex: 'visitCount',
      key: 'visitCount',
    },
    {
      title: 'Стоимость за посещение',
      dataIndex: 'costPerVisit',
      key: 'costPerVisit',
      render: (cost) => `${cost} ₽`,
    },
    {
      title: 'Общая стоимость',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (cost) => `${cost} ₽`,
    },
  ];

  useEffect(() => {
    const fetchServicesCost = async () => {
      setLoading(true);
      try {
        // Здесь будет запрос к API для получения данных о стоимости услуг
        const response = await fetch(`/api/children/${childId}/services-cost`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: dateRange[0].format('YYYY-MM-DD'),
            endDate: dateRange[1].format('YYYY-MM-DD'),
          }),
        });
        const data = await response.json();
        setServices(data.services);
        setTotalCost(data.totalCost);
      } catch (error) {
        console.error('Ошибка при загрузке данных о стоимости услуг:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServicesCost();
  }, [childId, dateRange]);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          format="DD.MM.YYYY"
        />
      </Space>
      
      <Card style={{ marginBottom: 16 }}>
        <Statistic
          title="Общая стоимость платных услуг за период"
          value={totalCost}
          suffix="₽"
        />
      </Card>

      <Table
        columns={columns}
        dataSource={services}
        loading={loading}
        rowKey="id"
      />
    </div>
  );
};

export default PaidServicesCost; 
// src/ConsultantManager.js

import React, { useState, useEffect } from "react";
import { Table, Button, Modal, Form, Input, Switch, Tag, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_URL + "/api/config";

// 模型管理主元件
export default function ConsultantManager() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();

  // --- 數據獲取 ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // R (Read): 讀取所有模型配置
      const response = await axios.get(API_BASE_URL);
      console.log(response);

      setData(response.data);
    } catch (error) {
      message.error("讀取模型配置失敗！");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- 表單提交處理 ---
  const handleFormSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEditing) {
        // U (Update): 編輯現有模型
        const idToUpdate = form.getFieldValue("consultantId");
        await axios.put(`${API_BASE_URL}/${idToUpdate}`, values);
        message.success("模型配置更新成功！");
      } else {
        // C (Create): 新增模型
        await axios.post(API_BASE_URL, values);
        message.success("新模型新增成功！");
      }

      setIsModalVisible(false); // 關閉彈窗
      form.resetFields(); // 重設表單
      fetchData(); // 刷新列表
    } catch (error) {
      message.error(error.response?.data?.message || "操作失敗，請檢查 ID 是否重複");
      console.error("Submit error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 編輯功能 ---
  const handleEdit = (record) => {
    setIsEditing(true);
    setIsModalVisible(true);
    // 使用 setFieldsValue 載入現有的數據到表單中
    form.setFieldsValue(record);
  };

  // --- 刪除功能 ---
  const handleDelete = (record) => {
    Modal.confirm({
      title: "確認刪除",
      icon: <ExclamationCircleOutlined />,
      content: `確定要刪除模型: ${record.name} (${record.consultantId}) 嗎？`,
      okText: "刪除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          // D (Delete): 刪除模型
          await axios.delete(`${API_BASE_URL}/${record.consultantId}`);
          message.success("模型刪除成功！");
          fetchData(); // 刷新列表
        } catch (error) {
          message.error("刪除失敗！");
          console.error("Delete error:", error);
        }
      },
    });
  };

  // --- 列表欄位定義 ---
  const columns = [
    {
      title: "ID / 名稱",
      dataIndex: "consultantId",
      key: "consultantId",
      render: (text, record) => (
        <>
          <strong>{record.name}</strong>
          <br />
          <small style={{ color: "#999" }}>{text}</small>
        </>
      ),
    },
    {
      title: "主題範圍",
      dataIndex: "topicScope",
      key: "topicScope",
      render: (scope) => (
        <div>
          {scope &&
            scope.slice(0, 3).map((tag, index) => (
              <Tag key={index} color="blue">
                {tag}
              </Tag>
            ))}
          {scope && scope.length > 3 && <Tag color="default">+{scope.length - 3}</Tag>}
        </div>
      ),
    },
    {
      title: "狀態",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive) => <Tag color={isActive ? "green" : "red"}>{isActive ? "活躍" : "停用"}</Tag>,
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_, record) => (
        <>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ marginRight: 8 }} />
          <Button icon={<DeleteOutlined />} onClick={() => handleDelete(record)} danger />
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>模型配置管理</h1>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          setIsEditing(false);
          setIsModalVisible(true);
          form.resetFields(); // 清空表單
        }}
        style={{ marginBottom: 16 }}
      >
        新增模型
      </Button>

      {/* 模型列表 Table */}
      <Table columns={columns} dataSource={data} rowKey="consultantId" loading={loading} pagination={{ pageSize: 10 }} />

      {/* 新增/編輯彈窗 Modal */}
      <Modal
        width={"80vw"}
        title={isEditing ? "編輯模型配置" : "新增模型配置"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={[
          <Button key="back" onClick={() => setIsModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
            {isEditing ? "儲存修改" : "新增"}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} initialValues={{ isActive: true, topicScope: [""] }}>
          <Form.Item name="consultantId" label="模型 ID (唯一識別碼)" rules={[{ required: true, message: "請輸入模型 ID" }]}>
            {/* 新增時可編輯，編輯時禁用 */}
            <Input placeholder="例如: jpmorgan_analyst" disabled={isEditing} />
          </Form.Item>

          <Form.Item name="name" label="顯示名稱" rules={[{ required: true, message: "請輸入模型名稱" }]}>
            <Input placeholder="例如: 摩根大通分析師" />
          </Form.Item>

          <Form.Item
            name="systemInstruction"
            label="系統指令 (System Instruction)"
            rules={[{ required: true, message: "請輸入完整的 Gemini 角色指令" }]}
            tooltip="這是設定 AI 角色、風格和規定的核心指令。"
          >
            <Input.TextArea rows={10} placeholder="例如: 你的名字是 XXX，你的職責是..." />
          </Form.Item>

          <Form.Item
            name="topicScope"
            label="意圖檢查範圍 (Scope)"
            rules={[{ required: true, message: "請至少輸入一個主題範圍" }]}
            tooltip="請用頓號分隔多個主題，用於後端判斷問題是否相關。"
            // 將陣列轉換為字串/字串轉換為陣列的處理
            getValueFromEvent={(e) =>
              e.target.value
                .split("、")
                .map((s) => s.trim())
                .filter((s) => s)
            }
            getValueProps={(value) => ({ value: Array.isArray(value) ? value.join("、") : value })}
          >
            <Input.TextArea rows={3} placeholder="例如: 台股趨勢分析、美股大盤預測、 科技股分析" />
          </Form.Item>

          <Form.Item name="isActive" label="是否活躍" valuePropName="checked">
            <Switch checkedChildren="活躍" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

import { Button, Col, Input, Row, Space } from "antd";
import React, { useEffect, useState } from "react";

export default function ClientSse() {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("未連線");
  const [isEventSource, setIsEventSource] = useState(null);

  const event = {
    handleReOpen: () => {
      if (isEventSource !== null) {
        setStatus("不可重複連線");
        setTimeout(() => {
          setStatus("🟢 已連線");
        }, 2000);
        return;
      }
      if (!window.EventSource) {
        setStatus("您的瀏覽器不支援 Server-Sent Events (SSE)");
        return;
      }
      setStatus("連線中...");

      const eventSource = new EventSource("http://localhost:3000/sse/stream");
      setIsEventSource(eventSource);
    },
    handleCloseEventSource: () => {
      isEventSource.close();
      setStatus("🔴 連線已斷開");
      setIsEventSource(null);
    },
  };

  useEffect(() => {
    if (isEventSource !== null) {
      // 處理連線開啟事件
      isEventSource.onopen = () => {
        setStatus("🟢 已連線");
        console.log("SSE 連線已開啟");
      };

      // 處理接收到的訊息 (即後端 res.write 發送的 data:)
      isEventSource.onmessage = (event) => {
        // event.data 是來自後端的字串
        let incomingData;
        try {
          // 後端發送的是 JSON 字串，需要解析
          incomingData = JSON.parse(event.data);
        } catch (e) {
          // 如果不是 JSON (例如初始連線訊息)，直接使用原始資料
          incomingData = { message: event.data, timestamp: new Date().toLocaleTimeString() };
        }

        // 將新數據加到列表的開頭
        setData((prevData) => [incomingData, ...prevData]);
        console.log("收到新數據:", incomingData);
      };

      // 處理連線錯誤事件
      isEventSource.onerror = (error) => {
        setStatus("🔴 連線錯誤或已斷開");
        console.error("SSE 連線錯誤:", error);
        isEventSource.close(); // 發生錯誤時關閉連線
      };
    }
  }, [isEventSource]);

  return (
    <Row gutter={[6, 6]}>
      <Col span={24} style={{ display: "flex", alignContent: "center", justifyContent: "center" }}>
        <Space.Compact>
          <Button type="primary" danger onClick={event.handleCloseEventSource}>
            斷開
          </Button>
          <Input />
          <Button type="primary" onClick={event.handleReOpen}>
            建立SSE連線
          </Button>
        </Space.Compact>
      </Col>
      <Col span={24}>
        <h1>Express SSE 客戶端 (React)</h1>
        <p>
          連線狀態: <b style={{ color: status.includes("🟢") ? "green" : "red" }}>{status}</b>
        </p>

        <div style={{ border: "1px solid #ccc", height: "400px", overflowY: "scroll", padding: "10px", backgroundColor: "#f9f9f9" }}>
          {data.length > 0 ? (
            data.map((item, index) => (
              <div key={index} style={{ padding: "8px", borderBottom: "1px dashed #eee", fontSize: "14px" }}>
                <strong>[{item.timestamp}]</strong> {item.message}
              </div>
            ))
          ) : (
            <p>等待來自後端的訊息...</p>
          )}
        </div>
      </Col>
    </Row>
  );
}

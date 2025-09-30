import React from "react";
import { Row, Col, Tabs } from "antd";
import ClientSse from "components/SSE/ClientSse";
import GeminiSse from "components/SSE/GeminiSse";

export default function App() {
  const onChange = (key) => {
    console.log(key);
  };
  return (
    <Row style={{ padding: "0 10px" }}>
      <Col span={24}>
        <Tabs
          defaultActiveKey="1"
          items={[
            { key: "1", label: "測試一", children: "Content of Tab Pane 1" },
            { key: "2", label: "SSE測試", children: <ClientSse /> },
            { key: "3", label: "Gemini模擬", children: <GeminiSse /> },
          ]}
          onChange={onChange}
        />
      </Col>
    </Row>
  );
}

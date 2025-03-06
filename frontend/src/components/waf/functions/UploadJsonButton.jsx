import React, { useRef } from "react";
import { Button } from "@mui/material";

const UploadJsonButton = ({ onJsonUpload = true, variant = "contained" }) => {
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        onJsonUpload(jsonData.Rules);
      } catch (error) {
        console.error("שגיאה בקריאת קובץ JSON:", error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <Button variant={variant} onClick={handleButtonClick} style={{width:'190px'}} >
        Upload JSON
      </Button>
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </>
  );
};

export default UploadJsonButton;

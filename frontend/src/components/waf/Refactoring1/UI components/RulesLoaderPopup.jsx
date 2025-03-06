import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Box,
  Select,
  MenuItem
} from "@mui/material";
import UploadJsonButton from "../../functions/UploadJsonButton";
import { fetchAclDetail, fetchAclsNames } from "../../../../utils/api";

const RulesLoaderPopup = ({ open, onRulesReceived, onClose }) => {
  const [step, setStep] = useState("initial");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [aclNames, setAclNames] = useState([]);
  const [loading, setLoading] = useState(false);

  // Array of AWS WAF supported regions with code and display name
  const regions = [
    { code: "global", name: "Global (CloudFront)" },
    { code: "us-east-1", name: "US East (N. Virginia)" },
    { code: "us-east-2", name: "US East (Ohio)" },
    { code: "us-west-1", name: "US West (N. California)" },
    { code: "us-west-2", name: "US West (Oregon)" },
    { code: "ap-south-1", name: "Asia Pacific (Mumbai)" },
    { code: "ap-northeast-3", name: "Asia Pacific (Osaka)" },
    { code: "ap-northeast-2", name: "Asia Pacific (Seoul)" },
    { code: "ap-southeast-1", name: "Asia Pacific (Singapore)" },
    { code: "ap-southeast-2", name: "Asia Pacific (Sydney)" },
    { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
    { code: "ca-central-1", name: "Canada (Central)" },
    { code: "eu-central-1", name: "Europe (Frankfurt)" },
    { code: "eu-west-1", name: "Europe (Ireland)" },
    { code: "eu-west-2", name: "Europe (London)" },
    { code: "eu-west-3", name: "Europe (Paris)" },
    { code: "eu-north-1", name: "Europe (Stockholm)" },
    { code: "sa-east-1", name: "South America (Sao Paulo)" }
  ];

  const handleJsonUpload = (jsonData) => {
    onRulesReceived(jsonData);
    onClose();
  };

  const handleFetchFromServer = () => {
    setStep("regionSelection");
  };

  const handleRegionSelect = async (region) => {
    if (!region) return;
    setSelectedRegion(region);
    setLoading(true);
    try {
      const data = await fetchAclsNames(region);
      setAclNames(data);
      setStep("aclSelection");
    } catch (error) {
      console.error("❌ Error fetching ACL names:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAclSelect = async (aclName) => {
    setLoading(true);
    try {
      const data = await fetchAclDetail(selectedRegion, aclName);
      onRulesReceived(data.Rules);
      onClose();
    } catch (error) {
      console.error("❌ Error fetching ACL details:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2, width: "100%" }}>
          <CircularProgress />
        </Box>
      );
    }

    if (step === "initial") {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            alignItems: "center",
            mt: 2
          }}
        >
          <Button variant="contained" onClick={handleFetchFromServer} style={{ width: '190px' }}>
            Fetch from Server
          </Button>
          <UploadJsonButton onJsonUpload={handleJsonUpload} />
        </Box>
      );
    } else if (step === "regionSelection") {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <DialogTitle>Select Region</DialogTitle>
          <Select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            displayEmpty
            fullWidth
          >
            <MenuItem value="" disabled>
              Select Region
            </MenuItem>
            {regions.map((region) => (
              <MenuItem key={region.code} value={region.code}>
                {region.name}
              </MenuItem>
            ))}
          </Select>
          <Button
            variant="contained"
            onClick={() => handleRegionSelect(selectedRegion)}
            disabled={!selectedRegion}
            fullWidth
          >
            Select
          </Button>
        </Box>
      );
    } else if (step === "aclSelection") {
      return (
        <Box>
          <DialogTitle textAlign={'center'}>Select ACL</DialogTitle>
          <List>
            {aclNames.length > 0 ? aclNames.map((acl) => (
              <ListItem key={acl} disablePadding>
                <ListItemButton onClick={() => handleAclSelect(acl)}>
                  <ListItemText primary={acl} />
                </ListItemButton>
              </ListItem>
            )): <ListItem><ListItemText style={{textAlign:'center'}} primary="No ACLs found" /></ListItem>}
          </List>
        </Box>
      );
    }
    return null;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      paper={{ style: { width: "500px", maxWidth: "500px" } }}
    >
      <DialogTitle textAlign="center">Load Rules</DialogTitle>
      <DialogContent>{renderContent()}</DialogContent>
      {step !== "initial" && (
        <DialogActions>
          <Button
            onClick={() => {
              setStep("initial");
              setAclNames([]);
            }}
          >
            Back
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default RulesLoaderPopup;
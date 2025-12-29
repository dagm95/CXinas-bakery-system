import React, { useState } from "react";
import {
  Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, TextField, Select, MenuItem, CircularProgress, Alert
} from "@mui/material";

import useInventoryData from "../hooks/useInventoryData";
import normalizeInventoryData from "../utils/normalizeInventoryData";


export default function GroundManagerInventory() {
  const { data, loading, error } = useInventoryData();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  // Each entry in data is a batch (cart sent at a time)
  // Try to get a timestamp if available, else use index
  const batches = Array.isArray(data) ? data : [];

  if (loading) return <div style={{textAlign: "center", marginTop: 40}}><CircularProgress /></div>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Card sx={{ maxWidth: 900, margin: "2rem auto", boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Ground Manager Inventory
        // Moved to pages/GroundManagerInventoryPage.jsx
        <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: 'center' }}>

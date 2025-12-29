import React from 'react'
import DashboardRoute from './DashboardRoute'

// Backwards-compatible Dashboard entry — delegate to DashboardRoute
export default function Dashboard(){
  return <DashboardRoute />
}

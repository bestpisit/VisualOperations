import React from 'react'
import DashboardPage from './DashboardPage'
import { redirect } from 'next/navigation'

const Dashboard = () => {
    return redirect('/projects');
    return (
        <DashboardPage />
    )
}

export default Dashboard
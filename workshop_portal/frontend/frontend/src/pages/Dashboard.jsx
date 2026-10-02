
import { useEffect, useState } from "react";
import API from "../services/api";
import socket from "../services/socket";
import "../styles/dashboard.css";

const Dashboard = () => {
    const [stats, setStats] = useState({
        workshops: 0,
        participants: 0,
        checkedIn: 0,
        announcements: 0
    });

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadDashboard = async () => {
        try {
            setLoading(true);

            const [
                workshopsRes,
                participantsRes,
                announcementsRes
            ] = await Promise.all([
                API.get("/workshops"),
                API.get("/participants"),
                API.get("/announcements")
            ]);

            const workshops =
                Array.isArray(workshopsRes.data)
                    ? workshopsRes.data
                    : workshopsRes.data?.workshops || [];

            const participants =
                Array.isArray(participantsRes.data)
                    ? participantsRes.data
                    : participantsRes.data?.participants || [];

            const announcementData =
                Array.isArray(announcementsRes.data)
                    ? announcementsRes.data
                    : announcementsRes.data?.announcements || [];

            const checkedIn = participants.filter(
                (participant) =>
                    participant.attendance_status === "checked_in"
            ).length;

            setStats({
                workshops: workshops.length,
                participants: participants.length,
                checkedIn,
                announcements: announcementData.length
            });

            setAnnouncements(announcementData);

        } catch (error) {
            console.error(
                "DASHBOARD LOAD ERROR:",
                error
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();

        if (!socket) {
            return;
        }

        socket.connect();

        socket.emit("joinDashboard");

        const handleNewAnnouncement = (announcement) => {
            setAnnouncements((previous) => [
                announcement,
                ...previous
            ]);

            setStats((previous) => ({
                ...previous,
                announcements:
                    previous.announcements + 1
            }));
        };

        const handleDashboardUpdate = () => {
            loadDashboard();
        };

        socket.on(
            "newAnnouncement",
            handleNewAnnouncement
        );

        socket.on(
            "announcementCreated",
            handleNewAnnouncement
        );

        socket.on(
            "dashboardUpdate",
            handleDashboardUpdate
        );

        return () => {
            socket.off(
                "newAnnouncement",
                handleNewAnnouncement
            );

            socket.off(
                "announcementCreated",
                handleNewAnnouncement
            );

            socket.off(
                "dashboardUpdate",
                handleDashboardUpdate
            );

            socket.emit("leaveDashboard");
            socket.disconnect();
        };
    }, []);

    return (
        <div className="dashboard-page">

            <div className="dashboard-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>
                        Workshop registration portal overview.
                    </p>
                </div>

                <button
                    type="button"
                    className="refresh-btn"
                    onClick={loadDashboard}
                    disabled={loading}
                >
                    {loading ? "Loading..." : "Refresh"}
                </button>
            </div>

            <div className="dashboard-cards">

                <div className="dashboard-card">
                    <span>Workshops</span>
                    <strong>{stats.workshops}</strong>
                </div>

                <div className="dashboard-card">
                    <span>Participants</span>
                    <strong>{stats.participants}</strong>
                </div>

                <div className="dashboard-card">
                    <span>Checked In</span>
                    <strong>{stats.checkedIn}</strong>
                </div>

                <div className="dashboard-card">
                    <span>Announcements</span>
                    <strong>{stats.announcements}</strong>
                </div>

            </div>

            <div className="dashboard-section">

                <div className="section-header">
                    <div>
                        <h2>Latest Announcements</h2>
                        <p>
                            Real-time workshop announcements.
                        </p>
                    </div>
                </div>

                {announcements.length === 0 ? (

                    <div className="empty-dashboard">
                        No announcements found.
                    </div>

                ) : (

                    <div className="announcement-list">

                        {announcements.map((item, index) => (

                            <div
                                className="dashboard-announcement"
                                key={
                                    item.id ||
                                    `announcement-${index}`
                                }
                            >

                                <div>
                                    <h3>
                                        {item.title}
                                    </h3>

                                    <p>
                                        {item.message}
                                    </p>
                                </div>

                                <small>
                                    {item.created_at
                                        ? new Date(
                                            item.created_at
                                        ).toLocaleString("en-IN")
                                        : ""}
                                </small>

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>
    );
};

export default Dashboard;


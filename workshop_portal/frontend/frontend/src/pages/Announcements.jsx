
import { useEffect, useState } from "react";
import API from "../services/api";
import socket from "../services/socket";
import "../styles/announcements.css";

const Announcements = () => {

    const [form, setForm] = useState({
        title: "",
        message: ""
    });

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadAnnouncements = async () => {

        try {

            const res = await API.get(
                "/announcements"
            );

            const data =
                Array.isArray(res.data)
                    ? res.data
                    : res.data?.announcements || [];

            setAnnouncements(data);

        } catch (error) {

            console.error(
                "LOAD ANNOUNCEMENTS ERROR:",
                error
            );

        }

    };

    useEffect(() => {

        loadAnnouncements();

        if (!socket) {
            return;
        }

        const handleNewAnnouncement = (
            announcement
        ) => {

            setAnnouncements(
                (previous) => {

                    const exists =
                        previous.some(
                            (item) =>
                                item.id ===
                                announcement.id
                        );

                    if (exists) {
                        return previous;
                    }

                    return [
                        announcement,
                        ...previous
                    ];
                }
            );

        };

        socket.on(
            "newAnnouncement",
            handleNewAnnouncement
        );

        socket.on(
            "announcementCreated",
            handleNewAnnouncement
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

        };

    }, []);

    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));

    };

    const submitAnnouncement = async (e) => {

        e.preventDefault();

        if (!form.title.trim()) {
            alert("Announcement title is required.");
            return;
        }

        if (!form.message.trim()) {
            alert("Announcement message is required.");
            return;
        }

        try {

            setLoading(true);

            await API.post(
                "/announcements",
                {
                    title: form.title.trim(),
                    message: form.message.trim()
                }
            );

            alert(
                "Announcement Created Successfully"
            );

            setForm({
                title: "",
                message: ""
            });

            await loadAnnouncements();

        } catch (error) {

            console.error(
                "CREATE ANNOUNCEMENT ERROR:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to create announcement"
            );

        } finally {

            setLoading(false);

        }

    };

    const deleteAnnouncement = async (id) => {

        if (
            !window.confirm(
                "Delete this announcement?"
            )
        ) {
            return;
        }

        try {

            await API.delete(
                `/announcements/${id}`
            );

            setAnnouncements(
                (previous) =>
                    previous.filter(
                        (item) =>
                            item.id !== id
                    )
            );

            alert(
                "Announcement Deleted Successfully"
            );

        } catch (error) {

            console.error(
                "DELETE ANNOUNCEMENT ERROR:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Delete Failed"
            );

        }

    };

    return (

        <div className="announcements-page">

            <div className="announcements-header">

                <div>
                    <h2>
                        Announcements
                    </h2>

                    <p>
                        Create and manage workshop
                        announcements.
                    </p>
                </div>

                <div className="announcement-count">
                    <strong>
                        {announcements.length}
                    </strong>

                    <span>
                        Total
                    </span>
                </div>

            </div>

            <div className="announcement-form-card">

                <h3>
                    Create Announcement
                </h3>

                <form
                    onSubmit={
                        submitAnnouncement
                    }
                >

                    <input
                        type="text"
                        name="title"
                        placeholder="Announcement Title"
                        value={form.title}
                        onChange={
                            handleChange
                        }
                        required
                    />

                    <textarea
                        name="message"
                        placeholder="Announcement Message"
                        value={form.message}
                        onChange={
                            handleChange
                        }
                        rows="5"
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Publishing..."
                            : "Publish Announcement"}
                    </button>

                </form>

            </div>

            <div className="announcement-list-card">

                <div className="announcement-list-header">

                    <div>
                        <h3>
                            All Announcements
                        </h3>

                        <p>
                            New announcements appear
                            automatically.
                        </p>
                    </div>

                </div>

                {announcements.length === 0 ? (

                    <div className="no-announcements">
                        No announcements found.
                    </div>

                ) : (

                    <div className="announcements-list">

                        {announcements.map(
                            (item) => (

                                <div
                                    className="announcement-item"
                                    key={item.id}
                                >

                                    <div className="announcement-content">

                                        <h4>
                                            {item.title}
                                        </h4>

                                        <p>
                                            {item.message}
                                        </p>

                                        {item.created_at && (

                                            <small>
                                                {new Date(
                                                    item.created_at
                                                ).toLocaleString(
                                                    "en-IN"
                                                )}
                                            </small>

                                        )}

                                    </div>

                                    <button
                                        type="button"
                                        className="announcement-delete-btn"
                                        onClick={() =>
                                            deleteAnnouncement(
                                                item.id
                                            )
                                        }
                                    >
                                        Delete
                                    </button>

                                </div>

                            )
                        )}

                    </div>

                )}

            </div>

        </div>
    );
};

export default Announcements;


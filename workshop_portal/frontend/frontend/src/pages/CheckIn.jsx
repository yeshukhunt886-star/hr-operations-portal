
import {
    useEffect,
    useState
} from "react";

import API from "../services/api";

import "../styles/checkin.css";


const CheckIn = () => {

    const [participants, setParticipants] = useState([]);

    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(false);


    /* =====================================================
       LOAD PARTICIPANTS
    ===================================================== */

    useEffect(() => {

        loadParticipants();

    }, []);


    const loadParticipants = async () => {

        try {

            setLoading(true);

            const res = await API.get(
                "/checkin"
            );


            if (
                Array.isArray(
                    res.data?.participants
                )
            ) {

                setParticipants(
                    res.data.participants
                );

            } else if (
                Array.isArray(res.data)
            ) {

                setParticipants(
                    res.data
                );

            } else {

                setParticipants([]);

            }

        } catch (error) {

            console.error(
                "CHECK-IN LOAD ERROR:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to load participants"
            );

        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
       CHECK IN
    ===================================================== */

    const checkInParticipant = async (id) => {

        try {

            setLoading(true);

            const res = await API.post(
                "/checkin/check-in",
                {
                    participant_id: Number(id)
                }
            );


            alert(
                res.data?.message ||
                "Check-in Successful"
            );


            await loadParticipants();

        } catch (error) {

            console.error(
                "CHECK-IN ERROR:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Check-in Failed"
            );

        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
       CHECK OUT
    ===================================================== */

    const checkOutParticipant = async (id) => {

        try {

            setLoading(true);

            const res = await API.post(
                "/checkin/check-out",
                {
                    participant_id: Number(id)
                }
            );


            alert(
                res.data?.message ||
                "Check-out Successful"
            );


            await loadParticipants();

        } catch (error) {

            console.error(
                "CHECK-OUT ERROR:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Check-out Failed"
            );

        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
       SEARCH
    ===================================================== */

    const filteredParticipants =
        participants.filter((participant) => {

            const keyword =
                search
                    .trim()
                    .toLowerCase();


            if (!keyword) {
                return true;
            }


            return (

                participant.full_name
                    ?.toLowerCase()
                    .includes(keyword)

                ||

                participant.email
                    ?.toLowerCase()
                    .includes(keyword)

                ||

                participant.phone
                    ?.toLowerCase()
                    .includes(keyword)

                ||

                participant.organization
                    ?.toLowerCase()
                    .includes(keyword)

                ||

                participant.workshop_title
                    ?.toLowerCase()
                    .includes(keyword)

            );

        });


    /* =====================================================
       STATUS
    ===================================================== */

    const getStatusText = (status) => {

        if (
            status === "checked_in"
        ) {

            return "Checked In";

        }


        if (
            status === "checked_out"
        ) {

            return "Checked Out";

        }


        return "Pending";

    };


    /* =====================================================
       RENDER
    ===================================================== */

    return (

        <div className="checkin-page">


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="checkin-header">

                <div>

                    <h2>
                        Participant Check-In
                    </h2>

                    <p>
                        Manage participant
                        attendance.
                    </p>

                </div>


                <div className="checkin-total">

                    <strong>
                        {
                            participants.length
                        }
                    </strong>

                    <span>
                        Participants
                    </span>

                </div>

            </div>


            {/* =================================================
                SEARCH
            ================================================= */}

            <div className="checkin-toolbar">

                <input
                    className="search-box"
                    type="text"
                    placeholder="Search participant..."
                    value={search}
                    onChange={(e) =>
                        setSearch(
                            e.target.value
                        )
                    }
                />


                <button
                    type="button"
                    onClick={() =>
                        setSearch("")
                    }
                >
                    Clear
                </button>

            </div>


            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (

                <div className="checkin-loading">

                    Loading...

                </div>

            )}


            {/* =================================================
                TABLE
            ================================================= */}

            <div className="checkin-table-wrapper">

                <table className="checkin-table">

                    <thead>

                        <tr>

                            <th>ID</th>

                            <th>Name</th>

                            <th>Email</th>

                            <th>Phone</th>

                            <th>Organization</th>

                            <th>Workshop</th>

                            <th>Status</th>

                            <th>Check-In Time</th>

                            <th>Check-Out Time</th>

                            <th>Action</th>

                        </tr>

                    </thead>


                    <tbody>

                        {
                            filteredParticipants.length === 0 ? (

                                <tr>

                                    <td colSpan="10">

                                        No Participants Found

                                    </td>

                                </tr>

                            ) : (

                                filteredParticipants.map(
                                    (participant) => (

                                        <tr
                                            key={
                                                participant.id
                                            }
                                        >


                                            {/* ID */}

                                            <td>
                                                {
                                                    participant.id
                                                }
                                            </td>


                                            {/* NAME */}

                                            <td>

                                                <strong>
                                                    {
                                                        participant.full_name
                                                    }
                                                </strong>

                                            </td>


                                            {/* EMAIL */}

                                            <td>
                                                {
                                                    participant.email ||
                                                    "-"
                                                }
                                            </td>


                                            {/* PHONE */}

                                            <td>
                                                {
                                                    participant.phone ||
                                                    "-"
                                                }
                                            </td>


                                            {/* ORGANIZATION */}

                                            <td>
                                                {
                                                    participant.organization ||
                                                    "-"
                                                }
                                            </td>


                                            {/* WORKSHOP */}

                                            <td>
                                                {
                                                    participant.workshop_title ||
                                                    "-"
                                                }
                                            </td>


                                            {/* STATUS */}

                                            <td>

                                                <span
                                                    className={
                                                        `status-badge ${
                                                            participant.attendance_status ||
                                                            "registered"
                                                        }`
                                                    }
                                                >

                                                    {
                                                        getStatusText(
                                                            participant.attendance_status
                                                        )
                                                    }

                                                </span>

                                            </td>


                                            {/* CHECK-IN TIME */}

                                            <td>

                                                {
                                                    participant.check_in_time ||
                                                    "-"
                                                }

                                            </td>


                                            {/* CHECK-OUT TIME */}

                                            <td>

                                                {
                                                    participant.check_out_time ||
                                                    "-"
                                                }

                                            </td>


                                            {/* ACTION */}

                                            <td>

                                                {
                                                    participant.attendance_status ===
                                                    "registered" ? (

                                                        <button
                                                            type="button"
                                                            className="checkin-btn"
                                                            onClick={() =>
                                                                checkInParticipant(
                                                                    participant.id
                                                                )
                                                            }
                                                            disabled={
                                                                loading
                                                            }
                                                        >
                                                            Check In
                                                        </button>

                                                    ) : participant.attendance_status ===
                                                      "checked_in" ? (

                                                        <button
                                                            type="button"
                                                            className="checkout-btn"
                                                            onClick={() =>
                                                                checkOutParticipant(
                                                                    participant.id
                                                                )
                                                            }
                                                            disabled={
                                                                loading
                                                            }
                                                        >
                                                            Check Out
                                                        </button>

                                                    ) : (

                                                        <span className="completed-text">
                                                            Completed
                                                        </span>

                                                    )
                                                }

                                            </td>


                                        </tr>

                                    )
                                )

                            )
                        }

                    </tbody>

                </table>

            </div>

        </div>

    );

};


export default CheckIn;



import { useEffect, useState } from "react";

import API from "../services/api";
import WorkshopForm from "../components/WorkshopForm";

import "../styles/workshop.css";


const Workshops = () => {

    const [workshops, setWorkshops] = useState([]);

    const [editing, setEditing] = useState(null);

    const [loading, setLoading] = useState(false);


    /* =====================================================
       LOAD WORKSHOPS
    ===================================================== */

    const loadWorkshops = async () => {

        try {

            setLoading(true);

            const res = await API.get("/workshops");


            if (
                Array.isArray(res.data?.workshops)
            ) {

                setWorkshops(
                    res.data.workshops
                );

            } else if (
                Array.isArray(res.data)
            ) {

                setWorkshops(
                    res.data
                );

            } else {

                setWorkshops([]);

            }

        } catch (error) {

            console.error(
                "LOAD WORKSHOPS ERROR:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to load workshops"
            );

        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {

        loadWorkshops();

    }, []);


    /* =====================================================
       CREATE / UPDATE WORKSHOP
    ===================================================== */

    const saveWorkshop = async (data) => {

        try {

            setLoading(true);


            if (editing) {

                await API.put(
                    `/workshops/${editing.id}`,
                    data
                );

                alert(
                    "Workshop Updated Successfully"
                );

                setEditing(null);

            } else {

                await API.post(
                    "/workshops",
                    data
                );

                alert(
                    "Workshop Created Successfully"
                );

            }


            await loadWorkshops();

        } catch (error) {

            console.error(
                "SAVE WORKSHOP ERROR:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Workshop Save Failed"
            );

        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
       DELETE WORKSHOP
    ===================================================== */

    const deleteWorkshop = async (id) => {

        const confirmDelete =
            window.confirm(
                "Are you sure you want to delete this workshop?"
            );


        if (!confirmDelete) {

            return;

        }


        try {

            setLoading(true);

            await API.delete(
                `/workshops/${id}`
            );


            alert(
                "Workshop Deleted Successfully"
            );


            if (
                editing?.id === id
            ) {

                setEditing(null);

            }


            await loadWorkshops();

        } catch (error) {

            console.error(
                "DELETE WORKSHOP ERROR:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Delete Failed"
            );

        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
       EDIT WORKSHOP
    ===================================================== */

    const editWorkshop = (workshop) => {

        setEditing(workshop);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    };


    /* =====================================================
       CANCEL EDIT
    ===================================================== */

    const cancelEdit = () => {

        setEditing(null);

    };


    /* =====================================================
       IMAGE URL
    ===================================================== */

    const getImageUrl = (image) => {

        if (!image) {

            return "";

        }


        if (
            image.startsWith("http")
        ) {

            return image;

        }


        return `http://localhost:3001${image}`;

    };


    /* =====================================================
       DATE FORMAT
    ===================================================== */

    const formatDate = (date) => {

        if (!date) {

            return "-";

        }


        const parsedDate =
            new Date(date);


        if (
            Number.isNaN(
                parsedDate.getTime()
            )
        ) {

            return date;

        }


        return parsedDate.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    };


    /* =====================================================
       RENDER
    ===================================================== */

    return (

        <div className="workshop-page">


            {/* HEADER */}

            <div className="workshop-header">

                <div>

                    <h2>
                        Workshop Management
                    </h2>

                    <p>
                        Create, update and manage
                        workshops.
                    </p>

                </div>


                <div className="workshop-total">

                    <strong>
                        {workshops.length}
                    </strong>

                    <span>
                        Total Workshops
                    </span>

                </div>

            </div>


            {/* FORM */}

            <div className="workshop-form-container">

                <div className="form-header">

                    <div>

                        <h3>
                            {
                                editing
                                    ? "Update Workshop"
                                    : "Create Workshop"
                            }
                        </h3>

                        <p>
                            {
                                editing
                                    ? "Update the selected workshop details."
                                    : "Add a new workshop to the portal."
                            }
                        </p>

                    </div>


                    {editing && (

                        <button
                            type="button"
                            className="cancel-edit-btn"
                            onClick={cancelEdit}
                        >
                            Cancel Edit
                        </button>

                    )}

                </div>


                <WorkshopForm
                    onSubmit={saveWorkshop}
                    editing={editing}
                />

            </div>


            {/* WORKSHOP LIST */}

            <div className="workshop-list-container">

                <div className="list-header">

                    <div>

                        <h3>
                            All Workshops
                        </h3>

                        <p>
                            View and manage
                            workshop records.
                        </p>

                    </div>

                </div>


                {/* LOADING */}

                {loading && (

                    <div className="workshop-loading">
                        Loading workshops...
                    </div>

                )}


                {/* EMPTY */}

                {!loading &&
                    workshops.length === 0 && (

                        <div className="no-workshops">

                            <h3>
                                No Workshops Found
                            </h3>

                            <p>
                                Create your first
                                workshop above.
                            </p>

                        </div>

                    )}


                {/* TABLE */}

                {!loading &&
                    workshops.length > 0 && (

                        <div className="table-wrapper">

                            <table className="workshop-table">

                                <thead>

                                    <tr>

                                        <th>ID</th>

                                        <th>
                                            Banner
                                        </th>

                                        <th>
                                            Title
                                        </th>

                                        <th>
                                            Venue
                                        </th>

                                        <th>
                                            Date
                                        </th>

                                        <th>
                                            Capacity
                                        </th>

                                        <th>
                                            Registered
                                        </th>

                                        <th>
                                            Action
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {workshops.map(
                                        (item) => {

                                            const workshopDate =
                                                item.workshop_date ||
                                                item.date;


                                            const registered =
                                                Number(
                                                    item.registered_count
                                                ) || 0;


                                            return (

                                                <tr
                                                    key={
                                                        item.id
                                                    }
                                                >

                                                    {/* ID */}

                                                    <td>
                                                        {item.id}
                                                    </td>


                                                    {/* BANNER */}

                                                    <td>

                                                        {item.banner ? (

                                                            <img
                                                                className="workshop-table-image"
                                                                src={
                                                                    getImageUrl(
                                                                        item.banner
                                                                    )
                                                                }
                                                                alt={
                                                                    item.title ||
                                                                    "Workshop"
                                                                }
                                                            />

                                                        ) : (

                                                            <span className="no-banner">
                                                                No Image
                                                            </span>

                                                        )}

                                                    </td>


                                                    {/* TITLE */}

                                                    <td className="title-cell">

                                                        <strong>
                                                            {
                                                                item.title
                                                            }
                                                        </strong>

                                                        {item.description && (

                                                            <small>
                                                                {
                                                                    item.description
                                                                }
                                                            </small>

                                                        )}

                                                    </td>


                                                    {/* VENUE */}

                                                    <td>
                                                        {
                                                            item.venue ||
                                                            "-"
                                                        }
                                                    </td>


                                                    {/* DATE */}

                                                    <td>
                                                        {
                                                            formatDate(
                                                                workshopDate
                                                            )
                                                        }
                                                    </td>


                                                    {/* CAPACITY */}

                                                    <td>
                                                        {
                                                            item.capacity ??
                                                            "-"
                                                        }
                                                    </td>


                                                    {/* REGISTERED */}

                                                    <td>

                                                        <span className="registered-badge">
                                                            {
                                                                registered
                                                            }
                                                        </span>

                                                    </td>


                                                    {/* ACTION */}

                                                    <td>

                                                        <div className="action-buttons">

                                                            <button
                                                                type="button"
                                                                className="edit-btn"
                                                                onClick={() =>
                                                                    editWorkshop(
                                                                        item
                                                                    )
                                                                }
                                                            >
                                                                Edit
                                                            </button>


                                                            <button
                                                                type="button"
                                                                className="delete-btn"
                                                                onClick={() =>
                                                                    deleteWorkshop(
                                                                        item.id
                                                                    )
                                                                }
                                                            >
                                                                Delete
                                                            </button>

                                                        </div>

                                                    </td>

                                                </tr>

                                            );

                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

            </div>

        </div>

    );

};


export default Workshops;


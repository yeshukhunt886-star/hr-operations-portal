
import { useEffect, useState } from "react";

import API from "../services/api";

import ParticipantForm from "../components/ParticipantForm";
import ParticipantTable from "../components/ParticipantTable";
import CSVImport from "../components/CSVImport";

import "../styles/participant.css";


const Participants = () => {

    const [participants, setParticipants] = useState([]);
    const [workshops, setWorkshops] = useState([]);

    const [editing, setEditing] = useState(null);

    const [search, setSearch] = useState("");
    const [workshop, setWorkshop] = useState("");

    const [loading, setLoading] = useState(false);


    // INITIAL LOAD

    useEffect(() => {

        loadParticipants();
        loadWorkshops();

    }, []);


 
      //  LOAD PARTICIPANTS
    const loadParticipants = async () => {

        try {

            setLoading(true);

            const res = await API.get(
                "/participants"
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

        } catch (err) {

            console.error(
                "LOAD PARTICIPANTS ERROR:",
                err
            );

            alert(
                err.response?.data?.message ||
                "Failed to load participants"
            );

        } finally {

            setLoading(false);

        }

    };


    
      //  LOAD WORKSHOPS
    const loadWorkshops = async () => {

        try {

            const res = await API.get(
                "/workshops"
            );


            if (
                Array.isArray(
                    res.data?.workshops
                )
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

        } catch (err) {

            console.error(
                "LOAD WORKSHOPS ERROR:",
                err
            );

        }

    };



      //  VALIDATION
    const validateParticipant = (data) => {

        if (!data.workshop_id) {

            alert(
                "Please select workshop"
            );

            return false;

        }


        if (
            !data.full_name ||
            !data.full_name.trim()
        ) {

            alert(
                "Participant name required"
            );

            return false;

        }


        if (
            !data.email ||
            !data.email.trim()
        ) {

            alert(
                "Email required"
            );

            return false;

        }


        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
            !emailRegex.test(
                data.email.trim()
            )
        ) {

            alert(
                "Invalid email format"
            );

            return false;

        }


        if (
            data.phone &&
            !/^\d{10}$/.test(
                data.phone
            )
        ) {

            alert(
                "Phone number must be 10 digits"
            );

            return false;

        }


        if (
            data.organization &&
            !data.organization.trim()
        ) {

            alert(
                "Organization required"
            );

            return false;

        }


        return true;

    };


      //  ADD PARTICIPANT
    const addParticipant = async (data) => {
        if (
            !validateParticipant(data)
        ) {

            return;

        }


        try {

            setLoading(true);


            await API.post(
                "/participants",
                {
                    workshop_id:
                        Number(
                            data.workshop_id
                        ),

                    full_name:
                        data.full_name.trim(),

                    email:
                        data.email.trim(),

                    phone:
                        data.phone || "",

                    organization:
                        data.organization?.trim() ||
                        "",

                    designation:
                        data.designation?.trim() ||
                        ""
                }
            );


            alert(
                "Participant Added Successfully"
            );


            setEditing(null);

            await loadParticipants();

        } catch (err) {

            console.error(
                "ADD PARTICIPANT ERROR:",
                err
            );

            alert(
                err.response?.data?.message ||
                "Failed to add participant"
            );

        } finally {

            setLoading(false);

        }

    };


   
      //  UPDATE PARTICIPANT
    const updateParticipant = async (
        id,
        data
    ) => {

        if (
            !validateParticipant(data)
        ) {

            return;

        }


        try {

            setLoading(true);


            await API.put(
                `/participants/${id}`,
                {
                    workshop_id:
                        Number(
                            data.workshop_id
                        ),

                    full_name:
                        data.full_name.trim(),

                    email:
                        data.email.trim(),

                    phone:
                        data.phone || "",

                    organization:
                        data.organization?.trim() ||
                        "",

                    designation:
                        data.designation?.trim() ||
                        ""
                }
            );


            alert(
                "Participant Updated Successfully"
            );


            setEditing(null);

            await loadParticipants();

        } catch (err) {

            console.error(
                "UPDATE PARTICIPANT ERROR:",
                err
            );

            alert(
                err.response?.data?.message ||
                "Failed to update participant"
            );

        } finally {

            setLoading(false);

        }

    };


      //  DELETE PARTICIPANT
    const deleteParticipant = async (
        id
    ) => {

        const confirmDelete =
            window.confirm(
                "Delete this participant?"
            );


        if (!confirmDelete) {

            return;

        }


        try {

            setLoading(true);


            await API.delete(
                `/participants/${id}`
            );


            alert(
                "Participant Deleted Successfully"
            );


            if (
                editing?.id === id
            ) {

                setEditing(null);

            }


            await loadParticipants();

        } catch (err) {

            console.error(
                "DELETE PARTICIPANT ERROR:",
                err
            );

            alert(
                err.response?.data?.message ||
                "Failed to delete participant"
            );

        } finally {

            setLoading(false);

        }

    };


  
      //  SEARCH
      //  NOTE:
      //  Current backend controller does not have
      //  /participants/search.
      //  Therefore search is handled on frontend.
  

    const filteredParticipants =
        participants.filter((p) => {

            const keyword =
                search
                    .trim()
                    .toLowerCase();


            if (!keyword) {

                return true;

            }


            return (

                p.full_name
                    ?.toLowerCase()
                    .includes(keyword)

                ||

                p.email
                    ?.toLowerCase()
                    .includes(keyword)

                ||

                p.phone
                    ?.toLowerCase()
                    .includes(keyword)

                ||

                p.organization
                    ?.toLowerCase()
                    .includes(keyword)

            );

        });


      //  WORKSHOP FILTER
    const filterWorkshop = async (
        workshopId
    ) => {

        try {

            setLoading(true);


            if (!workshopId) {

                await loadParticipants();

                return;

            }


            const res =
                await API.get(
                    `/participants/workshop/${workshopId}`
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

        } catch (err) {

            console.error(
                "FILTER PARTICIPANTS ERROR:",
                err
            );

            alert(
                err.response?.data?.message ||
                "Failed to filter participants"
            );

        } finally {

            setLoading(false);

        }

    };


      //  CLEAR FILTERS
    const clearFilters = async () => {

        setSearch("");
        setWorkshop("");

        await loadParticipants();

    };


      //  RENDER
    return (

        <div className="participants-page">

            <ParticipantForm

                editing={editing}

                workshops={workshops}

                onSubmit={(data) =>

                    editing

                        ?

                        updateParticipant(
                            editing.id,
                            data
                        )

                        :

                        addParticipant(data)

                }

            />

                {/*  TOOLBAR */}
            <div className="participant-toolbar">

                <input
                    type="text"
                    placeholder="Search participant..."
                    value={search}
                    onChange={(e) =>
                        setSearch(
                            e.target.value
                        )
                    }
                />


                <select
                    value={workshop}
                    onChange={(e) => {

                        const value =
                            e.target.value;

                        setWorkshop(value);

                        filterWorkshop(
                            value
                        );

                    }}
                >

                    <option value="">
                        All Workshops
                    </option>


                    {workshops.map(
                        (w) => (

                            <option
                                key={w.id}
                                value={w.id}
                            >
                                {w.title}
                            </option>

                        )
                    )}

                </select>


                <button
                    type="button"
                    onClick={clearFilters}
                >
                    Clear
                </button>

            </div>



                {/* STATUS */}
            {loading && (

                <div className="participant-loading">
                    Loading participants...
                </div>

            )}

                {/* TABLE */}
            <ParticipantTable

                participants={
                    filteredParticipants
                }

                onEdit={
                    setEditing
                }

                onDelete={
                    deleteParticipant
                }

            />

        </div>

    );

};


export default Participants;


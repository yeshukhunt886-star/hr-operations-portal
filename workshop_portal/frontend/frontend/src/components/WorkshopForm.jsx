
import {
    useEffect,
    useState
} from "react";


const WorkshopForm = ({
    onSubmit,
    editing
}) => {

    const [form, setForm] = useState({
        title: "",
        description: "",
        workshop_date: "",
        venue: "",
        capacity: ""
    });


    const [banner, setBanner] = useState(null);


    /* =====================================================
       LOAD EDITING DATA
    ===================================================== */

    useEffect(() => {

        if (editing) {

            setForm({
                title:
                    editing.title || "",

                description:
                    editing.description || "",

                workshop_date:
                    editing.workshop_date ||
                    editing.date ||
                    "",

                venue:
                    editing.venue ||
                    "",

                capacity:
                    editing.capacity ||
                    ""
            });

            setBanner(null);

        } else {

            resetForm();

        }

    }, [editing]);


    /* =====================================================
       HANDLE INPUT
    ===================================================== */

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


    /* =====================================================
       HANDLE BANNER
    ===================================================== */

    const handleBannerChange = (e) => {

        const file =
            e.target.files?.[0];

        if (!file) {

            setBanner(null);

            return;

        }


        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
        ];


        if (
            !allowedTypes.includes(
                file.type
            )
        ) {

            alert(
                "Please select JPG, PNG or WEBP image."
            );

            e.target.value = "";

            setBanner(null);

            return;

        }


        if (
            file.size >
            5 * 1024 * 1024
        ) {

            alert(
                "Banner image must be less than 5 MB."
            );

            e.target.value = "";

            setBanner(null);

            return;

        }


        setBanner(file);

    };


    /* =====================================================
       RESET FORM
    ===================================================== */

    const resetForm = () => {

        setForm({
            title: "",
            description: "",
            workshop_date: "",
            venue: "",
            capacity: ""
        });

        setBanner(null);

    };


    /* =====================================================
       SUBMIT
    ===================================================== */

    const submitHandler = async (e) => {

        e.preventDefault();


        try {

            const formData =
                new FormData();


            formData.append(
                "title",
                form.title
            );

            formData.append(
                "description",
                form.description
            );

            formData.append(
                "workshop_date",
                form.workshop_date
            );

            formData.append(
                "venue",
                form.venue
            );

            formData.append(
                "capacity",
                form.capacity
            );


            /* Banner */

            if (banner) {

                formData.append(
                    "banner",
                    banner
                );

            }


            await onSubmit(
                formData
            );


            /*
             * Clear only when creating.
             */

            if (!editing) {

                resetForm();

            }

        } catch (error) {

            console.error(
                "WORKSHOP FORM ERROR:",
                error
            );

        }

    };


    return (

        <form
            className="workshop-form"
            onSubmit={submitHandler}
        >

            {/* =================================================
                TITLE
            ================================================= */}

            <input
                type="text"
                name="title"
                placeholder="Workshop Title"
                value={form.title}
                onChange={handleChange}
                required
            />


            {/* =================================================
                DESCRIPTION
            ================================================= */}

            <textarea
                name="description"
                placeholder="Workshop Description"
                value={form.description}
                onChange={handleChange}
                required
            />


            {/* =================================================
                DATE
            ================================================= */}

            <input
                type="date"
                name="workshop_date"
                value={form.workshop_date}
                onChange={handleChange}
                required
            />


            {/* =================================================
                VENUE
            ================================================= */}

            <input
                type="text"
                name="venue"
                placeholder="Venue"
                value={form.venue}
                onChange={handleChange}
                required
            />


            {/* =================================================
                CAPACITY
            ================================================= */}

            <input
                type="number"
                name="capacity"
                placeholder="Capacity"
                min="1"
                value={form.capacity}
                onChange={handleChange}
                required
            />


            {/* =================================================
                BANNER
            ================================================= */}

            <div className="banner-upload">

                <label htmlFor="banner">
                    Workshop Banner
                </label>


                <input
                    id="banner"
                    type="file"
                    name="banner"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={
                        handleBannerChange
                    }
                />


                <small>
                    JPG, PNG or WEBP.
                    Maximum 5 MB.
                </small>

            </div>


            {/* =================================================
                CURRENT BANNER
            ================================================= */}

            {editing?.banner &&
                !banner && (

                    <div className="current-banner">

                        <span>
                            Current Banner:
                        </span>


                        <img
                            src={
                                editing.banner.startsWith(
                                    "http"
                                )
                                    ? editing.banner
                                    : `http://localhost:3001${editing.banner}`
                            }
                            alt="Current workshop banner"
                        />

                    </div>

                )}


            {/* =================================================
                SELECTED BANNER
            ================================================= */}

            {banner && (

                <div className="selected-banner">

                    <span>
                        Selected:
                        {" "}
                        {banner.name}
                    </span>

                </div>

            )}


            {/* =================================================
                SUBMIT
            ================================================= */}

            <button
                type="submit"
            >

                {
                    editing
                        ? "Update Workshop"
                        : "Create Workshop"
                }

            </button>

        </form>

    );

};


export default WorkshopForm;


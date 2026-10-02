import { Link } from "react-router-dom";
import "../styles/sidebar.css";


const Sidebar = () => {


    const user = JSON.parse(
        localStorage.getItem("user")
    );


    const role = user?.role;



    return (

        <div className="sidebar">


            <h2>

                {
                    role === "admin"
                    ?
                    "Admin Panel"
                    :
                    role === "staff" ||
                    role === "checkin_staff"
                    ?
                    "Staff Panel"
                    :
                    role === "viewer"
                    ?
                    "Viewer Panel"
                    :
                    "Workshop Portal"
                }


            </h2>




            {/* Admin Menu */}

            {
                role === "admin" &&

                <>


                    <Link to="/dashboard">

                        Dashboard

                    </Link>



                    <Link to="/workshops">

                        Workshops

                    </Link>


                </>

            }






            {/* Admin + Staff Menu */}

            {
                (
                    role === "admin" ||
                    role === "checkin_staff" ||
                    role === "staff"
                )

                &&

                <>

                    <Link to="/participants">

                        Participants

                    </Link>



                    <Link to="/checkin">

                        Check-In

                    </Link>


                </>

            }






            {/* Admin + Viewer Menu */}

            {
                (
                    role === "admin" ||
                    role === "viewer"
                )

                &&

                <Link to="/reports">

                    Reports

                </Link>

            }







            {/* Admin Only */}

            {
                role === "admin" &&

                <Link to="/announcements">

                    Announcements

                </Link>

            }






            {/* Logout */}

            <Link to="/">

                Logout

            </Link>




        </div>

    );

};


export default Sidebar;
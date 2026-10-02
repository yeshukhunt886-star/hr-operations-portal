import { useState, useContext } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import "../styles/login.css";


const Login = () => {


    const [email, setEmail] = useState("");

    const [password, setPassword] = useState("");



    const navigate = useNavigate();


    const auth = useContext(AuthContext);


    console.log("Auth Context:", auth);



    const login = auth?.login;




    const submit = async (e) => {

        e.preventDefault();



        try {


            const res = await API.post(
                "/auth/login",
                {
                    email,
                    password
                }
            );



            login(
                res.data.user,
                res.data.token
            );



            const role = res.data.user.role;



            console.log(
                "ROLE:",
                role
            );



            if(role === "admin"){

                navigate("/dashboard");

            }


           else if(
                role === "checkin_staff" ||
                role === "staff"
            ){

                console.log("GOING TO CHECKIN");

                navigate("/checkin");

            }


            else if(role === "viewer"){

                navigate("/reports");

            }


            else{

                navigate("/");

            }



        }
        catch(err){


            console.log(
                err
            );


            alert(
                "Invalid Credentials"
            );


        }


    };




    return (

        <div className="login-page">


            <form
            onSubmit={submit}
            className="login-box"
            >


                <h2>
                    Admin Login
                </h2>



                <input

                    type="email"

                    placeholder="Email"

                    value={email}

                    onChange={(e)=>
                        setEmail(e.target.value)
                    }

                />



                <input

                    type="password"

                    placeholder="Password"

                    value={password}

                    onChange={(e)=>
                        setPassword(e.target.value)
                    }

                />



                <button type="submit">

                    Login

                </button>



            </form>


        </div>

    );


};


export default Login;
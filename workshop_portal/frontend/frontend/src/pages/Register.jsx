import {
useState
} from "react";

import API from "../services/api";

import {
useNavigate
} from "react-router-dom";


const Register =()=>{


const navigate = useNavigate();


const [form,setForm]=useState({

    name:"",
    email:"",
    password:"",
    role:"viewer"

});



const changeHandler=(e)=>{


setForm({

    ...form,

    [e.target.name]:
    e.target.value

});


};





const submit=async(e)=>{


e.preventDefault();



if(!form.name){

    alert("Name required");
    return;

}



if(!form.email){

    alert("Email required");
    return;

}



if(form.password.length < 6){

    alert(
        "Password minimum 6 characters"
    );

    return;

}



try{


await API.post(
    "/auth/register",
    form
);



alert(
    "Registration Successful"
);



navigate("/login");



}
catch(err){


alert(

err.response?.data?.message ||
"Registration Failed"

);


}



};




return(

<div>


<h2>
Register
</h2>



<form onSubmit={submit}>


<input

name="name"

placeholder="Name"

onChange={changeHandler}

/>



<input

name="email"

type="email"

placeholder="Email"

onChange={changeHandler}

/>



<input

name="password"

type="password"

placeholder="Password"

onChange={changeHandler}

/>



<select

name="role"

onChange={changeHandler}

>


<option value="viewer">
Viewer
</option>


<option value="staff">
Staff
</option>


<option value="admin">
Admin
</option>


</select>




<button>

Register

</button>



</form>


</div>


);


};


export default Register;
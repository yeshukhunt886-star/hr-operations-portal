const loginForm =
document.getElementById("loginForm");


loginForm.addEventListener(
"submit",
async(e)=>{


e.preventDefault();



const email =
document.getElementById(
"email"
).value;



const password =
document.getElementById(
"password"
).value;



try{


const response =
await fetch(
"http://localhost:3000/api/auth/login",
{

method:"POST",

headers:{
    "Content-Type":"application/json"
},


body:JSON.stringify({

email:email,

password:password

})


}
);



const data =
await response.json();



console.log(data);



if(!response.ok){

alert(
data.message || "Login Failed"
);

return;

}



// =========================
// SAVE TOKEN
// =========================


localStorage.setItem(
"token",
data.token
);



// SAVE USER

localStorage.setItem(
"user",
JSON.stringify(
    data.user
)
);




// SUCCESS

alert(
"Login Successful"
);



// redirect chat

window.location.href =
"chat.html";



}
catch(error){


console.log(
"Login Error:",
error
);


alert(
"Server Error"
);


}



});
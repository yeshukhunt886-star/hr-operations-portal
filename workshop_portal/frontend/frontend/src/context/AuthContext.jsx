import { createContext, useState } from "react";


const AuthContext = createContext();


export default AuthContext;



export const AuthProvider = ({ children }) => {


    const [user, setUser] = useState(
        JSON.parse(
            localStorage.getItem("user")
        ) || null
    );


    const [token, setToken] = useState(
        localStorage.getItem("token") || null
    );



  const login = (userData, tokenData)=>{


    setUser(userData);

    setToken(tokenData);



    localStorage.setItem(
        "user",
        JSON.stringify(userData)
    );


    localStorage.setItem(
        "token",
        tokenData
    );


    localStorage.setItem(
        "role",
        userData.role
    );


};



    const logout = () => {


        setUser(null);

        setToken(null);


        localStorage.clear();


    };



    return (

        <AuthContext.Provider

            value={{
                user,
                token,
                login,
                logout
            }}

        >

            {children}

        </AuthContext.Provider>

    );

};
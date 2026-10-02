import {
    useEffect,
    useState
} from "react";

import API from "../services/api";

import "../styles/reports.css";


const Reports = () => {


    const [participants, setParticipants] = useState([]);

    const [loading, setLoading] = useState(true);



    useEffect(() => {

        loadParticipants();

    }, []);




    const loadParticipants = async () => {

        try {

            const res = await API.get(
                "/participants"
            );


            const data =
                res.data.participants ||
                res.data ||
                [];


            setParticipants(data);


        } catch (err) {

            console.error(
                "Reports Error:",
                err.response?.data ||
                err.message
            );


        } finally {

            setLoading(false);

        }

    };





    const exportCSV = async () => {


        if (participants.length === 0) {

            alert(
                "No participant data found"
            );

            return;

        }



        const headers = [

            "Name",
            "Email",
            "Phone",
            "Organization",
            "Status"

        ];



        const rows = participants.map(
            (item) => [

                item.full_name,
                item.email,
                item.phone,
                item.organization,
                item.attendance_status

            ]
        );



        const csvData = [

            headers,

            ...rows

        ]
        .map(
            row => row.join(",")
        )
        .join("\n");




        const blob = new Blob(

            [csvData],

            {
                type: "text/csv"
            }

        );



        const url =
            window.URL.createObjectURL(blob);



        const link =
            document.createElement("a");



        link.href = url;


        link.download =
            "participants_report.csv";



        link.click();


        window.URL.revokeObjectURL(url);


    };





    if (loading) {

        return (

            <h3>
                Loading Reports...
            </h3>

        );

    }





    return (

        <div className="reports">


            <h2>
                Participant Reports
            </h2>



            <button

                className="export-btn"

                onClick={exportCSV}

            >

                Export CSV

            </button>




            {

                participants.length === 0 ?

                (

                    <h3>
                        No Participants Found
                    </h3>

                )

                :

                (

                    <table>

                        <thead>

                            <tr>

                                <th>Name</th>

                                <th>Email</th>

                                <th>Phone</th>

                                <th>Organization</th>

                                <th>Status</th>

                            </tr>

                        </thead>


                        <tbody>


                            {

                                participants.map(

                                    (item)=>(

                                        <tr key={item.id}>

                                            <td>
                                                {item.full_name}
                                            </td>


                                            <td>
                                                {item.email}
                                            </td>


                                            <td>
                                                {item.phone}
                                            </td>


                                            <td>
                                                {item.organization}
                                            </td>


                                            <td>
                                                {item.attendance_status}
                                            </td>


                                        </tr>

                                    )

                                )

                            }


                        </tbody>


                    </table>

                )

            }


        </div>

    );

};



export default Reports;
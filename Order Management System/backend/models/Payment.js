import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Payment=sequelize.define("Payment",{

id:{
type:DataTypes.INTEGER,
primaryKey:true,
autoIncrement:true
},

amount:{
type:DataTypes.DECIMAL(10,2),
allowNull:false
},

paymentMethod:{
type:DataTypes.ENUM("Cash","Card","UPI"),
allowNull:false
},

paymentStatus:{
type:DataTypes.ENUM("Pending","Success","Failed"),
defaultValue:"Pending"
}

},{
tableName:"payments"
});

export default Payment;
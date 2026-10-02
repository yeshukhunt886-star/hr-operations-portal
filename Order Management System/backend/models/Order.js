import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Order = sequelize.define("Order",{

id:{
type:DataTypes.INTEGER,
primaryKey:true,
autoIncrement:true
},

totalAmount:{
type:DataTypes.DECIMAL(10,2),
allowNull:false
},

status:{
type:DataTypes.ENUM(
"Pending",
"Completed",
"Cancelled"
),
defaultValue:"Pending"
}

},{
tableName:"orders"
});

export default Order;
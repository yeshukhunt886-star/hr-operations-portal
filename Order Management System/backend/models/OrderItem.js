import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const OrderItem=sequelize.define("OrderItem",{

id:{
type:DataTypes.INTEGER,
primaryKey:true,
autoIncrement:true
},

quantity:{
type:DataTypes.INTEGER,
allowNull:false
},

price:{
type:DataTypes.DECIMAL(10,2),
allowNull:false
}

},{
tableName:"order_items"
});

export default OrderItem;
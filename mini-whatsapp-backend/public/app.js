

const token = localStorage.getItem("token");
const user = JSON.parse(
    localStorage.getItem("user")
);
if (!token || !user) {
    window.location.href = "/login.html";
}

document.getElementById("user").innerHTML ="User : " + user.username;
// SOCKET CONNECTION

const socket = io("http://localhost:3001",{
        auth: {
            token: token
        }
    });

// SELECTED USER
let selectedUser = null;
let selectedGroup = null;

// CONNECT
socket.on("connect",()=>{

    console.log("Socket Connected :",socket.id);
    document.getElementById("status").innerHTML ="🟢 Connected";
      socket.emit("joinUser", user.id);
    loadGroups();
    loadUnreadCounts();

});


// CONNECTION ERROR
socket.on("connect_error", (err) => {
    console.log(  err.message );

});

// ONLINE USERs
socket.on("onlineUsers", (users) => {
    console.log("Online Users:", users);

    const list = document.getElementById( "onlineUsers"  );
    if (!list) return;
    list.innerHTML = "";
    users.forEach((u) => {
        if (u.id == user.id) {return; }

        const div =document.createElement(  "div");
        div.innerHTML =
            (u.status === "online" ? "🟢 ": "⚪ ")
            +
            u.username;

        div.style.cursor = "pointer";
        div.style.padding = "8px";
        div.style.borderBottom =
            "1px solid #ddd";
        
        div.onclick = async () => {
            selectedUser = u;
            console.log("Selected User:",selectedUser );
            document.getElementById( "chatUser" ).innerHTML ="Chat with : "
                +
                u.username;
            document.getElementById("messages" ).innerHTML = "";
            await loadChatHistory(u.id);
            loadUnreadCounts();
        };
        list.appendChild(div);
    });
});

// OPEN PRIVATE CHAT
function openPrivateChat(u)
{
    selectedUser=u;
    selectedGroup=null;

    document.getElementById("chatTitle").innerHTML=u.username;
    document.getElementById("messages").innerHTML="";

    socket.emit("getPrivateHistory",
    {userId:u.id}
    );

}

// TYPING STATUS
const messageInput = document.getElementById("messageInput");
let typingTimer;
messageInput.addEventListener("input", () => {
    if (!selectedUser) return;
    socket.emit("typing", {
        receiverId: selectedUser.id
    });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        socket.emit("stopTyping", {
            receiverId: selectedUser.id
        });
    }, 1000);
});

// SEND PRIVATE MESSAGE
function sendMessage() {
    const input =document.getElementById("messageInput");
    const message = input.value.trim();

    if (message === "") {
        return;
    }
    // GROUP MESSAGE
    if(selectedGroup)
    {
        socket.emit(
            "groupMessage",
            {
                group_id:selectedGroup.id,
                message:message
            }
        );
    }
    // PRIVATE MESSAGE
    else if(selectedUser)
    {
        socket.emit(
            "privateMessage",
            {
                receiver:selectedUser.id,
                message:message
            }
        );
    }
    else
    {
        alert(
            "Select User or Group first"
        );
           return;
    }
    input.value="";
}

// RECEIVE NEW PRIVATE MESSAGE
socket.on("privateMessage",(data)=>{
    console.log("Incoming:",data);
    displayMessage({
        id:data.id,
        sender_id:data.sender_id,
        sender:data.username,
        message:data.message,
        created_at:data.created_at,
        status:"delivered"
    });

    socket.emit("messageSeen",{messageId:data.id});
});

// MESSAGE SENT (✓)
socket.on("messageSent", (data) => {
    console.log("Message Sent:",data);

    displayMessage({
        id: data.id,
        sender: data.sender,
        message: data.message,
        created_at: data.created_at,
        status: "sent"
    });
});

// MESSAGE DELIVERED (✓✓)
socket.on("messageDelivered", (data) => {
    console.log( "Delivered:",data);
    const tick =
        document.getElementById(
            "tick-" + data.messageId
        );
    if (tick) {
        tick.innerHTML = "✓✓";
    }
});

// MESSAGE SEEN (Blue ✓✓)
socket.on("messageSeen", (data) => {
    console.log("Seen:",data);
    const tick =document.getElementById(
         "tick-" + data.messageId
        );
    if (tick) {
        tick.innerHTML =
            "<span style='color:blue;'>✓✓</span>";
    }
});


// SOCKET HISTORY
socket.on("privateHistory", (messages) => {
    console.log( "Socket History:", messages);

    const box =document.getElementById("messages");
    box.innerHTML = "";
    messages.forEach((msg) => {
        displayMessage({
            id: msg.id,
            sender: msg.sender,
            message: msg.message,
            created_at: msg.created_at,
            status: msg.status
        });
    });
});

// DISPLAY MESSAGE
function displayMessage(data) {

    const box = document.getElementById("messages");

    if (!box) return;

    // Check whether message is sent by logged-in user
    const isMine = data.sender === user.username;
    const div = document.createElement("div");

    // WhatsApp-style alignment
    div.style.display = "flex";
    div.style.justifyContent =
        isMine ? "flex-end" : "flex-start";

    div.style.marginBottom = "10px";

    let tick = "";

    // Message status
    if (isMine) {

        if (data.status === "sent") {
            tick = "✓";
        }

        else if (data.status === "delivered") {
            tick = "✓✓";
        }

        else if (data.status === "seen") {
            tick =
                "<span style='color:#2196F3;'>✓✓</span>";
        }
    }

    // Message time
    let time = "";
    if (data.created_at) {
        const d = new Date(data.created_at);
        time =d.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
        });
    }

    div.innerHTML = `
        <div
            id="msg-${data.id}"
            style="
                max-width:70%;
                padding:10px;
                border-radius:10px;
                background:${isMine ? "#DCF8C6" : "#FFFFFF"};
                border:1px solid #ddd;">

            <div>${data.message}</div>
            <div
                style="
                    text-align:right;
                    font-size:11px;
                    color:gray;
                    margin-top:5px;">
                ${time}
                <span id="tick-${data.id}"> ${tick} </span>
            </div>
        </div>
    `;

    box.appendChild(div);

    // Automatically scroll to latest message
    box.scrollTop = box.scrollHeight;
}

async function loadChatHistory(userId) {
    try {
        const response = await fetch(`http://localhost:3000/api/messages/private/${userId}`,
            {headers: {Authorization: "Bearer " + token}}
        );

        const data = await response.json();
        const box =document.getElementById("messages");
        box.innerHTML = "";
        data.messages.forEach(msg => {
            displayMessage({
                id: msg.id,
                sender: msg.sender,
                message: msg.message,
                created_at: msg.created_at,
                status: msg.status
            });

            // Mark received messages as Seen
            if (msg.sender !== user.username) {
                socket.emit("messageSeen",
                    {
                        messageId: msg.id
                    }
                );
            }
        });
    }
    catch (err) {
       console.log(err);
    }
}
// LOAD MY GROUPS
async function loadGroups(){
    try{
    const response=await fetch("http://localhost:3000/api/groups/all",{
    headers:{
    Authorization:"Bearer "+token
    }
});

const groups=await response.json();
    const list=document.getElementById("groupList");
    if(!list)return;
    list.innerHTML="";

groups.forEach((group)=>{

    const div=document.createElement("div");
    div.innerHTML=group.group_name;

    div.style.cursor="pointer";
    div.style.padding="8px";
    div.style.borderBottom="1px solid #ddd";

    div.onclick=()=>{
        openGroup(group);
    };

    list.appendChild(div);
    });

}catch(error){console.log("Load Groups Error:",error);}
}
loadGroups();

async function loadUnreadCounts() {
    try {
        const response = await fetch(
            "http://localhost:3000/api/messages/unread/count",
            {
                method: "GET",
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const data = await response.json();
        console.log("Unread API Response:", data);

        if (!response.ok) {
            console.error("Unread API Error:", data.message);
            return;
        }
        console.log("Unread Count:", data.unreadCount);

    } catch (error) {
        console.error("Unread Count Error:", error);
    }
}

// CREATE GROUP
async function createGroup(){
    const input=document.getElementById("groupNameInput");
    if(!input){
        alert("groupNameInput element not found.");
        return;
    }

    const groupName=input.value.trim();
    if(!groupName){
        alert("Enter Group Name");
        return;
    }

    const response=await fetch("http://localhost:3000/api/groups/create",
        {
            method:"POST",
            headers:{"Content-Type":"application/json",
                    Authorization:"Bearer "+token
            },
            body:JSON.stringify({group_name:groupName})
        }
    );

    const data=await response.json();
        socket.emit("fileMessage",{
            receiver:selectedUser.id,
            file_url:data.file_url,
            file_name:file.name
        });

    console.log(data);
    alert("Group Created");
    input.value="";
    loadGroups();
}

// OPEN GROUP CHAT
function openGroup(group){
    selectedGroup=group;
    selectedUser=null;

    document.getElementById("chatUser").innerHTML="Group : "+group.group_name;
    document.getElementById("messages").innerHTML="";

    socket.emit("joinGroupRoom",{
    group_id:group.id});

    socket.emit("getGroupHistory",{
    group_id:group.id});
}

// GROUP JOIN SUCCESS
socket.on("groupJoined",(data)=>{
console.log("Joined Group:",data.group_id);
});

// RECEIVE GROUP MESSAGE
socket.on("receiveGroupMessage",(data)=>{
    console.log("Group Message:",data);
    displayMessage({
        id:data.id,
        sender_id:data.sender_id,
        sender:data.username,
        message:data.message,
        created_at:data.created_at,
        status:""
    });

});

// GROUP HISTORY
socket.on("groupHistory",(messages)=>{
const box=document.getElementById("messages");
box.innerHTML="";
    messages.forEach((msg)=>{
        displayMessage({
            id:msg.id,
            sender:msg.username,
            message:msg.message,
            created_at:msg.created_at,
            status:""
        });
    });
});

// LEAVE GROUP
function leaveGroup(){
    if(!selectedGroup){
        alert("Select Group First");
        return;
    }

    socket.emit("leaveGroupRoom",{group_id:selectedGroup.id    });

    selectedGroup=null;
    document.getElementById("chatUser").innerHTML="None";
}

// LOAD GROUP MEMBERS
async function loadMembers(){

    if(!selectedGroup){
        alert("Select Group First");
        return;
    }

    try{
    const response=await fetch(`http://localhost:3000/api/groups/${selectedGroup.id}/members`,
        {headers:{Authorization:"Bearer "+token}}
    );

    const members=await response.json();
    document.getElementById("members").innerHTML=members.map((member)=>`
    <p>${member.username}-${member.role}</p>
    `).join("");
    }catch(error){console.log("Members Error:",error);}
}


// images 
async function sendPrivateImage() {
    if (!selectedUser) {
        alert("Select a user first");
        return;
    }

    const input =document.getElementById("imageInput");
    if (!input) {
        alert("imageInput not found");
        return;
    }

    const file =input.files[0];
    if (!file) {
        alert("Select an image");
        return;
    }
    const formData =new FormData();
    formData.append("file",file);
    try {
        const response =await fetch("http://localhost:3000/api/upload/image",
                {
                    method: "POST",
                    headers: {Authorization:"Bearer " + token},
                    body: formData
                }
            );
        const data =await response.json();
        console.log ("Image Upload Response:",data);

        if (!response.ok) {
            alert(data.message ||"Image upload failed");
            return;
        }

        const uploadedFile =data.file;
        if (!uploadedFile) {
            console.error("data.file not found:",data);
            alert("Image URL not found");
            return;
        }

        let imageUrl = uploadedFile.url;
        if (imageUrl &&
            imageUrl.startsWith("/"))

         {imageUrl ="http://localhost:3000" +imageUrl;}

        console.log("Final Image URL:",imageUrl);
        socket.emit("privateImage",
            {
                receiver:selectedUser.id,
                file_url:imageUrl,
                file_name:uploadedFile.originalname ||file.name,
                file_type:uploadedFile.mimetype ||file.type
            }
        );
        input.value = "";
    } catch (error) {
        console.error("Image Upload Error:",error);
    }
}

// videos
async function sendPrivateVideo() {
    if (!selectedUser) {
        alert("Select a user first");
        return;
    }
    const input =document.getElementById("videoInput");
    if (!input) {
        alert("videoInput not found");
        return;
    }

    const file =input.files[0];

    if (!file) {
        alert("Select a video");
        return;
    }
    const formData =new FormData();
    formData.append("file",file);
    try {
        const response =await fetch("http://localhost:3000/api/upload/video",
                {
                    method:"POST",
                    headers: {Authorization:"Bearer " +token},
                    body:formData
                }
            );

        const data =await response.json();
        console.log("Video Upload Response:",data);

        if (!response.ok) {
            alert(data.message ||"Video upload failed");
            return;
        }
    
        const uploadedFile = data.file;
        if (!uploadedFile) {
            console.error("Upload response does not contain data.file:",data);
            alert("Video URL not found");
            return;
        }

        let videoUrl = uploadedFile.url;
        // If backend returns only filename
        if (!videoUrl && uploadedFile.filename) {
            videoUrl ="/uploads/videos/" + uploadedFile.filename;
        }

        // Make sure URL is available from browser
        if (videoUrl && videoUrl.startsWith("/")) {
            videoUrl ="http://localhost:3000" +videoUrl;
        }
        console.log("Final Video URL:",videoUrl);

        if (!videoUrl) {
            alert("Video URL is missing"); return;
        }
        socket.emit("privateVideo",
            {
                receiver: selectedUser.id,
                file_url: videoUrl,
                file_name:uploadedFile.originalname ||file.name,
                file_type:uploadedFile.mimetype ||file.type
            }
        );
        input.value = "";
    }
    catch (error) {
        console.error("Video Upload Error:",error);
    }
}

// RECEIVE PRIVATE IMAGE
socket.on("receivePrivateImage", (data) => {

    console.log("Received Private Image:", data);

    const container = document.getElementById("messages");

    if (!container) {
        console.error("messages div not found");
        return;
    }

    const messageDiv = document.createElement("div");

    messageDiv.className = "message";

    // Image only
    const img = document.createElement("img");
    img.src = data.file_url;

    img.alt = "Image";

    img.style.maxWidth = "300px";
    img.style.maxHeight = "300px";
    img.style.display = "block";
    img.style.borderRadius = "8px";

    // Download button
    const download = document.createElement("a");
    download.href = data.file_url;
    download.download =data.file_name || "image.png";
    download.innerText ="Download Image";
    download.className ="download-btn";

    // Add image
    messageDiv.appendChild(img);

    // Add download button
    messageDiv.appendChild(download);

    // Add to chat
    container.appendChild(messageDiv);

    // Scroll to bottom
    container.scrollTop =
        container.scrollHeight;

});


socket.on("privateVideo",(data) => {
        displayVideoMessage(data);
    }
);

function displayVideoMessage(data) {
    const box =document.getElementById("messages");
    if (!box) return;

    const isMine =data.sender === user.username;
    const div = document.createElement("div");

    div.style.display ="flex";
    div.style.justifyContent =isMine
            ? "flex-end"
            : "flex-start";

    div.style.marginBottom ="10px";
    div.innerHTML = `<div
            style="
                max-width:70%;
                padding:8px;
                border-radius:10px;
                background:${isMine
                        ? "#DCF8C6"
                        : "#FFFFFF"};
                border:1px solid #ddd;">

            <video src="${data.file_url}"
                controls style="
                    width:250px;
                    max-height:300px;
                    border-radius:8px;
                    display:block;">
            </video>

            <div
                style="text-align:right;
                    font-size:11px;
                    color:gray;
                    margin-top:5px;">

                ${new Date(data.created_at
                    ).toLocaleTimeString(
                        [],
                        {hour:"2-digit",minute:"2-digit"}
                    )
                }
                ${isMine? " ✓": ""}
            </div>
        </div>`;

    box.appendChild(div);
    box.scrollTop =box.scrollHeight;
}

async function loadPrivateChatHistory(userId) {
    try {
        const token =localStorage.getItem("token");

        const response =
            await fetch(`http://localhost:3000/api/messages/private/${userId}`,
                {
                    method: "GET",
                    headers: {
                        "Authorization":
                            `Bearer ${token}`,
                        "Content-Type":"application/json"
                    }
                }
            );
        
        const data =await response.json();
        const messagesDiv =document.getElementById("privateMessages");
        messagesDiv.innerHTML = "";
        if (data.success) {
            data.messages.forEach(
                message => {
                    displayPrivateMessage(message);
                }
            );
        }

    } catch (error) {
        console.error("Load Private History Error:",error);
    }
}

function displayPrivateMessage(data) {
    const messagesDiv =document.getElementById("privateMessages");
    const messageDiv = document.createElement("div");

    if (
        data.message_type === "text"
    ) {

        messageDiv.innerHTML = `
            <p>
                <b>
                    ${data.sender_name}
                </b>
            </p>

            <p>
                ${data.message}
            </p>

            <small>
                ${data.created_at}
            </small>
        `;
    }

    else if (
        data.message_type === "image"
    ) {
        const fileUrl ="http://localhost:3000" +data.file_url;

        messageDiv.innerHTML = `
            <p>
                <b>
                    ${data.sender_name}
                </b>
            </p>
            <img
                src="${fileUrl}"
                style="
                    max-width: 250px;
                    display: block;">
            <small>
                ${data.file_name}
            </small>
        `;
    }

    else if (
        data.message_type === "video"
    ) {
        const fileUrl ="http://localhost:3000" +data.file_url;

        messageDiv.innerHTML = `
            <p>
                <b>
                    ${data.sender_name}
                </b>
            </p>
            <video
                controls
                width="300">
                <source
                    src="${fileUrl}"
                    type="${data.file_type}">
            </video>
            <br>
            <small>
                ${data.file_name}
            </small>
        `;
    }

    else if (
        data.message_type === "document"
    ) {
        const fileUrl ="http://localhost:3000" +data.file_url;

        messageDiv.innerHTML = `
            <p>
                <b>
                    ${data.sender_name}
                </b>
            </p>
            <a
                href="${fileUrl}"
                target="_blank"
                download>📄${data.file_name}</a>
        `;
    }
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop =messagesDiv.scrollHeight;
}

socket.on("receivePrivateFile",(data) => {
        console.log("Received File:",data);
        const messages =document.getElementById("privateMessages");
        const message =document.createElement("div");
        // IMAGE
        if (
            data.messageType === "image"
        ) {
            message.innerHTML = `
                <p>
                    <b>${data.senderName || "User"}</b>
                </p>
                <img
                    src="${data.fileUrl}"
                    style="
                        max-width: 250px;
                        display: block;">
                <small>${data.fileName}</small>
            `;
        }
        // VIDEO
        else if (
            data.messageType === "video"
        ) {
            message.innerHTML = `
                <p>
                    <b>${data.senderName || "User"}</b>
                </p>
                <video
                    controls
                    style=" max-width: 300px;">
                    <source
                        src="${data.fileUrl}"
                        type="${data.fileType}">
                </video>
                <br>
                <small>${data.fileName}</small>
            `;
        }
        // DOCUMENT
        else {
            message.innerHTML = `
                <p>
                    <b>${data.senderName || "User"}</b>
                </p>
                <a
                    href="${data.fileUrl}"
                    target="_blank"
                    download>📄${data.fileName}
                </a>
            `;
        }
        messages.appendChild(message);
        messages.scrollTop =messages.scrollHeight;
    }
);


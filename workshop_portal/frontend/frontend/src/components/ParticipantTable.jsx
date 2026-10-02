import React from "react";

const ParticipantTable = ({
  participants = [],
  onEdit,
  onDelete,
}) => {
  return (
    <div className="participant-table-container">
      <table className="participant-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Workshop</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Organization</th>
            <th>Designation</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {participants.length > 0 ? (
            participants.map((participant) => (
              <tr key={participant.id}>
                <td>{participant.id}</td>

                <td>
                  {participant.workshop_title ||
                    participant.title ||
                    participant.workshop_id}
                </td>

                <td>{participant.full_name}</td>

                <td>{participant.email}</td>

                <td>{participant.phone}</td>

                <td>{participant.organization}</td>

                <td>{participant.designation}</td>

                <td>{participant.attendance_status}</td>

                <td>
                  <button
                    className="edit-btn"
                    onClick={() => onEdit(participant)}
                  >
                    Edit
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => onDelete(participant.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="9"
                style={{
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                No participants found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ParticipantTable;
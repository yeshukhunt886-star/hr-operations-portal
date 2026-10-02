import { useState, useEffect } from "react";

const ParticipantForm = ({ onSubmit, editing, workshops }) => {
  const [form, setForm] = useState({
    workshop_id: "",
    full_name: "",
    email: "",
    phone: "",
    organization: "",
    designation: "",
  });

  useEffect(() => {
    if (editing) {
      setForm({
        workshop_id: editing.workshop_id || "",
        full_name: editing.full_name || "",
        email: editing.email || "",
        phone: editing.phone || "",
        organization: editing.organization || "",
        designation: editing.designation || "",
      });
    } else {
      setForm({
        workshop_id: "",
        full_name: "",
        email: "",
        phone: "",
        organization: "",
        designation: "",
      });
    }
  }, [editing]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const submit = (e) => {
    e.preventDefault();

    onSubmit(form);

    if (!editing) {
      setForm({
        workshop_id: "",
        full_name: "",
        email: "",
        phone: "",
        organization: "",
        designation: "",
      });
    }
  };

  return (
    <form onSubmit={submit} className="participant-form">

      <select
        name="workshop_id"
        value={form.workshop_id}
        onChange={handleChange}
        required
      >
        <option value="">Select Workshop</option>

        {workshops.map((workshop) => (
          <option key={workshop.id} value={workshop.id}>
            {workshop.title}
          </option>
        ))}
      </select>

      <input
        type="text"
        name="full_name"
        placeholder="Full Name"
        value={form.full_name}
        onChange={handleChange}
        required
      />

      <input
        type="email"
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        required
      />

      <input
        type="text"
        name="phone"
        placeholder="Phone Number"
        value={form.phone}
        onChange={handleChange}
        required
      />

      <input
        type="text"
        name="organization"
        placeholder="Organization"
        value={form.organization}
        onChange={handleChange}
      />

      <input
        type="text"
        name="designation"
        placeholder="Designation"
        value={form.designation}
        onChange={handleChange}
      />

      <button type="submit">
        {editing ? "Update Participant" : "Add Participant"}
      </button>

    </form>
  );
};

export default ParticipantForm;
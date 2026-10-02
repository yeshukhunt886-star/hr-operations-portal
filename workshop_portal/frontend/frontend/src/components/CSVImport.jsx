import { useRef, useState } from "react";
import API from "../services/api";

const CSVImport = ({ onSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  const uploadCSV = async () => {
    if (!file) {
      alert("Please select a CSV file.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      // This must match upload.single("file") in your backend
      formData.append("file", file);

      const res = await API.post(
        "/participants/import",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert(res.data.message || "CSV Imported Successfully");

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.message ||
        "CSV Import Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="csv-import">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button
        onClick={uploadCSV}
        disabled={loading}
      >
        {loading ? "Uploading..." : "Upload CSV"}
      </button>
    </div>
  );
};

export default CSVImport;
import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  uploadDocument,
} from "../api/api";

function UploadDocument() {
  const navigate =
    useNavigate();

  const [file, setFile] =
    useState(null);

  const [category, setCategory] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [progress, setProgress] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      setError("");

      if (!file) {
        setError(
          "Please select a file."
        );

        return;
      }

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "category",
        category
      );

      formData.append(
        "description",
        description
      );

      try {
        setLoading(true);

        const response =
          await uploadDocument(
            formData,
            (event) => {
              if (
                event.total
              ) {
                setProgress(
                  Math.round(
                    (event.loaded /
                      event.total) *
                      100
                  )
                );
              }
            }
          );

        if (
          !response.data.success
        ) {
          throw new Error(
            response.data.message ||
            "Upload failed."
          );
        }

        navigate(
          `/documents/${response.data.document.id}`
        );

      } catch (error) {
        setError(
          error.response?.data
            ?.message ||
          error.message ||
          "Upload failed."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="form-page">

      <div className="page-header">
        <div>
          <h1>
            Upload Document
          </h1>

          <p>
            Store a private document
            securely.
          </p>
        </div>
      </div>

      <div className="form-card">

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
        >

          <label>
            File
          </label>

          <input
            type="file"
            onChange={(e) =>
              setFile(
                e.target.files?.[0] ||
                null
              )
            }
            required
          />

          {file && (
            <div className="file-preview">
              <strong>
                {file.name}
              </strong>

              <span>
                {formatBytes(
                  file.size
                )}
              </span>
            </div>
          )}

          <label>
            Category
          </label>

          <input
            type="text"
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value
              )
            }
            maxLength={100}
            placeholder="Reports"
          />

          <label>
            Description
          </label>

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            maxLength={1000}
            rows={5}
            placeholder="Monthly company report"
          />

          {loading && (
            <div className="progress-container">

              <div
                className="progress-bar"
                style={{
                  width: `${progress}%`,
                }}
              />

              <span>
                {progress}%
              </span>

            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="primary-button"
          >
            {loading
              ? "Uploading..."
              : "Upload Securely"}
          </button>

        </form>

      </div>

    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 Bytes";

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
  ];

  const i =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );

  return `${(
    bytes /
    Math.pow(1024, i)
  ).toFixed(2)} ${units[i]}`;
}

export default UploadDocument;
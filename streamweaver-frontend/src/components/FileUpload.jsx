export default function FileUpload() {
  return (
    <div className="upload-container">
      <h2>StreamWeaver</h2>
      <p>Upload your CSV or JSON file</p>
      <input type="file" accept=".csv,.json" />
    </div>
  );
}

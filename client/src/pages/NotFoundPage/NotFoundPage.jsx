"use client"

import Link from "next/link" // Changed from react-router-dom
import Navbar from "../../components/Navbar/Navbar" // Corrected path
import "./NotFoundPage.css"

const NotFoundPage = () => {
  return (
    <div className="not-found-page">
      <Navbar />

      <main className="container not-found-container">
        <div className="not-found-content">
          <h1>404</h1>
          <h2>Page Not Found</h2>
          <p>The page you are looking for doesn't exist or has been moved.</p>
          <Link href="/" className="btn btn-primary">
            Go Home
          </Link>
        </div>
      </main>
    </div>
  )
}

export default NotFoundPage
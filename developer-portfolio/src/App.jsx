
import "./App.css";

function App() {
  return (
    <div className="portfolio">
      {/* Navbar */}
      <header className="navbar">
        <div className="container navbar-content">
          <a href="#home" className="logo">
            Yeshu<span>.</span>
          </a>

          <nav>
            <a href="#home">Home</a>
            <a href="#about">About</a>
            <a href="#skills">Skills</a>
            <a href="#projects">Projects</a>
            <a href="#experience">Experience</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section id="home" className="hero">
          <div className="container hero-content">
            <div className="hero-text">
              <p className="hero-subtitle">Hello, I'm</p>

              <h1>
                Yeshu <span>Khunt</span>
              </h1>

              <h2>Full-Stack / Backend Developer</h2>

              <p className="hero-description">
                I build backend applications, REST APIs and database-driven
                web applications using JavaScript, Node.js, Express.js,
                MySQL and Prisma.
              </p>

              <div className="hero-buttons">
                <a href="#projects" className="btn btn-primary">
                  View Projects
                </a>

                <a href="#contact" className="btn btn-secondary">
                  Contact Me
                </a>
              </div>

              <div className="social-links">
                <a href="#" target="_blank" rel="noreferrer">
                  GitHub
                </a>

                <a href="#" target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </div>
            </div>

            <div className="hero-card">
              <div className="code-window">
                <div className="code-header">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <pre>
{`const developer = {
  name: "Yeshu Khunt",
  role: "Backend Developer",
  skills: [
    "JavaScript",
    "Node.js",
    "Express.js",
    "MySQL",
    "Prisma"
  ],
  available: true
};`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="section">
          <div className="container">
            <p className="section-label">ABOUT ME</p>

            <h2 className="section-title">Who I Am</h2>

            <div className="about-content">
              <div>
                <p>
                  I am a BCA graduate and aspiring software developer with
                  hands-on experience building backend and full-stack
                  applications.
                </p>

                <p>
                  My main focus is backend development, REST API development,
                  database management and authentication systems. I enjoy
                  creating practical applications that solve real-world
                  problems.
                </p>

                <p>
                  I am currently improving my development skills and preparing
                  for fresher opportunities in the IT industry.
                </p>
              </div>

              <div className="about-box">
                <div>
                  <strong>BCA</strong>
                  <span>Education</span>
                </div>

                <div>
                  <strong>1</strong>
                  <span>Projects</span>
                </div>

                <div>
                  <strong>Backend</strong>
                  <span>Focus</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section id="skills" className="section section-dark">
          <div className="container">
            <p className="section-label">MY SKILLS</p>

            <h2 className="section-title">Technologies I Use</h2>

            <div className="skills-grid">
              <div className="skill-card">
                <h3>JavaScript</h3>
                <p>Modern JavaScript and backend development.</p>
              </div>

              <div className="skill-card">
                <h3>Node.js</h3>
                <p>Server-side JavaScript applications and APIs.</p>
              </div>

              <div className="skill-card">
                <h3>Express.js</h3>
                <p>REST APIs and backend application development.</p>
              </div>

              <div className="skill-card">
                <h3>MySQL</h3>
                <p>Relational databases and SQL queries.</p>
              </div>

              <div className="skill-card">
                <h3>Prisma ORM</h3>
                <p>Database access and application data management.</p>
              </div>

              <div className="skill-card">
                <h3>REST APIs</h3>
                <p>API design, testing and integration.</p>
              </div>

              <div className="skill-card">
                <h3>JWT</h3>
                <p>Authentication and authorization systems.</p>
              </div>

              <div className="skill-card">
                <h3>Git & GitHub</h3>
                <p>Version control and project management.</p>
              </div>

              <div className="skill-card">
                <h3>Postman</h3>
                <p>API testing and backend validation.</p>
              </div>
            </div>
          </div>
        </section>


        {/* Projects */}
        <section id="projects" className="section">
          <div className="container">
            <p className="section-label">MY WORK</p>

            <h2 className="section-title">Featured Project</h2>

            <div className="projects-grid single-project">
              <article className="project-card">
                <div className="project-number">01</div>

                <h3>HR Operations Portal</h3>

                <p>
                  A full-stack HR management application for managing employees,
                  attendance, leave requests, payroll and role-based access control.
                  The system provides separate functionality for Admin, HR, Manager
                  and Employee roles.
                </p>

                <div className="project-tech">
                  <span>React</span>
                  <span>Node.js</span>
                  <span>Express.js</span>
                  <span>MySQL</span>
                  <span>Prisma</span>
                  <span>JWT</span>
                  <span>REST API</span>
                </div>

                <div className="project-buttons">
                  <a
                    href="http://localhost:5173"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-link"
                  >
                    View Project →
                  </a>

                  <a
                    href="https://github.com/YOUR-GITHUB-USERNAME/YOUR-HR-REPOSITORY"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-link github-link"
                  >
                    GitHub →
                  </a>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Experience */}
        <section id="experience" className="section section-dark">
          <div className="container">
            <p className="section-label">EXPERIENCE</p>

            <h2 className="section-title">My Experience</h2>

            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-dot"></div>

                <div className="timeline-content">
                  <span className="timeline-date">
                    Internship
                  </span>

                  <h3>Software Development Intern</h3>

                  <p>
                    Worked on software development tasks and gained practical
                    experience with application development, APIs, databases
                    and development tools.
                  </p>

                  <div className="project-tech">
                    <span>JavaScript</span>
                    <span>Node.js</span>
                    <span>SQL</span>
                    <span>Git</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Education */}
        <section className="section">
          <div className="container">
            <p className="section-label">EDUCATION</p>

            <h2 className="section-title">Education</h2>

            <div className="education-card">
              <div>
                <h3>Bachelor of Computer Applications</h3>
                <p>BCA</p>
              </div>

              <span>Graduate</span>
            </div>
          </div>
        </section>

     {/* Contact */}
      <section id="contact" className="section contact-section">
        <div className="container contact-content">
          <p className="section-label">CONTACT</p>

          <h2 className="section-title">Let's Work Together</h2>

          <p>
            I am currently looking for fresher opportunities in software
            development and backend development.
          </p>

          <a
            href="mailto:yeshukhunt886@gmail.com"
            className="btn btn-primary"
          >
            Email Me
          </a>

          <div className="contact-links">
            <a
              href="https://github.com/yeshukhunt886-star"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>

            <a
              href="YOUR_LINKEDIN_URL"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer>
        <div className="container">
          <p>© 2026 Yeshu Khunt. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;


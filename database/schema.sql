/**
 * Schéma de la base de données Étudia+
 * Créer ce schéma dans PostgreSQL
 */

-- ==================== TABLES UTILISATEURS ====================

-- Table des utilisateurs
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  profile_photo_url VARCHAR(500),
  school VARCHAR(255),
  program VARCHAR(255),
  session VARCHAR(50),
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  subscription_type VARCHAR(20) NOT NULL DEFAULT 'trial' CHECK (subscription_type IN ('trial', 'monthly', 'annual', 'none')),
  subscription_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'expired', 'canceled')),
  trial_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  trial_end TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  subscription_start TIMESTAMP,
  subscription_end TIMESTAMP,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Index pour recherche rapide
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ==================== TABLES DOCUMENTS ====================

-- Table des documents
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_size INT,
  file_type VARCHAR(50),
  school VARCHAR(255),
  program VARCHAR(255),
  course_code VARCHAR(50),
  course_name VARCHAR(255),
  uploaded_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  download_count INT DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des évaluations de documents
CREATE TABLE document_ratings (
  id SERIAL PRIMARY KEY,
  document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, user_id)
);

-- Table des signalements de documents
CREATE TABLE document_reports (
  id SERIAL PRIMARY KEY,
  document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  reported_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(255),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_program ON documents(program);
CREATE INDEX idx_documents_course ON documents(course_code);

-- ==================== TABLES FORUM ====================

-- Table des questions du forum
CREATE TABLE forum_questions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  asked_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_resolved BOOLEAN DEFAULT false
);

-- Table des réponses aux questions
CREATE TABLE forum_answers (
  id SERIAL PRIMARY KEY,
  question_id INT NOT NULL REFERENCES forum_questions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  answered_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  helpful_votes INT DEFAULT 0,
  is_marked_solution BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des votes sur les réponses
CREATE TABLE answer_votes (
  id SERIAL PRIMARY KEY,
  answer_id INT NOT NULL REFERENCES forum_answers(id) ON DELETE CASCADE,
  voted_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(answer_id, voted_by)
);

-- Table des notifications du forum
CREATE TABLE forum_notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INT REFERENCES forum_questions(id) ON DELETE CASCADE,
  answer_id INT REFERENCES forum_answers(id) ON DELETE CASCADE,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide
CREATE INDEX idx_forum_questions_asked_by ON forum_questions(asked_by);
CREATE INDEX idx_forum_questions_category ON forum_questions(category);
CREATE INDEX idx_forum_answers_question_id ON forum_answers(question_id);
CREATE INDEX idx_forum_answers_answered_by ON forum_answers(answered_by);

-- ==================== STATISTIQUES ====================

-- Table des statistiques utilisateur
CREATE TABLE user_statistics (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  documents_uploaded INT DEFAULT 0,
  documents_approved INT DEFAULT 0,
  questions_asked INT DEFAULT 0,
  answers_provided INT DEFAULT 0,
  helpful_answers INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== TABLES NOTES ====================

CREATE TABLE notebooks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  color VARCHAR(20) DEFAULT '#0d6efd',
  is_favorite BOOLEAN DEFAULT false,
  is_trashed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE note_pages (
  id SERIAL PRIMARY KEY,
  notebook_id INT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  page_order INT NOT NULL,
  sheet_type VARCHAR(20) NOT NULL DEFAULT 'lined' CHECK (sheet_type IN ('blank', 'lined', 'grid', 'dotted')),
  preview_text TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE note_elements (
  id SERIAL PRIMARY KEY,
  page_id INT NOT NULL REFERENCES note_pages(id) ON DELETE CASCADE,
  element_type VARCHAR(50) NOT NULL,
  element_data JSONB NOT NULL,
  z_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX idx_notebooks_updated_at ON notebooks(updated_at DESC);
CREATE INDEX idx_notebooks_favorite ON notebooks(user_id, is_favorite);
CREATE INDEX idx_note_pages_notebook_id ON note_pages(notebook_id, page_order);
CREATE INDEX idx_note_elements_page_id ON note_elements(page_id, z_index);

-- ==================== PERMISSIONS ====================

-- Créer l'utilisateur PostgreSQL pour l'application
-- À exécuter avec un compte super-utilisateur
-- CREATE USER edudia_user WITH PASSWORD 'your_password_here';
-- GRANT ALL PRIVILEGES ON DATABASE edudia_db TO edudia_user;

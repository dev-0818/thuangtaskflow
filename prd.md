# Product Requirements Document (PRD) - TaskFlow (Task Management System)

## 1. Ringkasan Proyek & Tujuan (Overview & Objective)
TaskFlow adalah sebuah platform manajemen tugas internal (Task Management System) berbasis web yang dirancang khusus untuk menyederhanakan proses delegasi kerja dari atasan (Manager) ke bawahan (Member). Sistem ini berfokus pada pelacakan tugas terstruktur melalui hierarki Task dan Subtask, visualisasi tenggat waktu menggunakan komponen Kalender interaktif, serta penyediaan Dashboard Analitik khusus bagi atasan untuk memantau produktivitas tim secara real-time.

Aplikasi ini mengusung pendekatan arsitektur modern berbasis Serverless/BaaS dengan mengandalkan Supabase sebagai infrastruktur backend utama dan Next.js sebagai framework frontend. Desain UI/UX dirancang dengan estetika minimalis, modern, elegan, menggunakan tema monokromatik (dark mode dominan) dengan pemanfaatan whitespace yang luas. Seluruh antarmuka **wajib bersifat mobile-responsive** agar optimal diakses dari berbagai perangkat (desktop, tablet, hingga smartphone).

---

## 2. Peran Pengguna (User Roles)
Sistem membagi pengguna ke dalam dua hak akses sistem (System Roles) utama yang diatur secara ketat melalui Row Level Security (RLS), ditambah dengan sistem "Jabatan" (Job Titles) dinamis:

* **Manager (Atasan / Admin):**
    * **User & Role Management:** Satu-satunya pihak yang berhak menambahkan pengguna baru ke dalam sistem dan mengatur "Jabatan" (Job Title) mereka.
    * **Master Data Management:** Dapat membuat, mengubah, dan menghapus daftar Master Jabatan (contoh: "Senior Developer", "UI/UX Designer", "QA Engineer").
    * Memiliki akses penuh ke Manager Dashboard.
    * Dapat membuat, memperbarui, menghapus, dan mendelegasikan Task serta Subtask.
* **Member (Bawahan):**
    * **Tidak bisa mendaftar sendiri (No Self-Registration).** Akun hanya bisa dibuatkan oleh Manager.
    * Dapat melihat daftar Task dan Subtask yang didelegasikan kepadanya.
    * Dapat mengubah status Subtask (Complete / In Progress) dan menambahkan Subtask baru di bawah Task utama yang ditugaskan.

---

## 3. Fitur Utama & Kebutuhan Fungsional (Core Features)

### 3.1. Autentikasi & Manajemen Pengguna (Khusus Atasan)
* **User Management:** Halaman khusus bagi Manager untuk mengundang/membuatkan akun untuk anggota tim baru, sekaligus menetapkan atasan langsung (`manager_id`) dan Jabatannya (`job_title_id`).
* **Master Jabatan (Job Titles):** Modul CRUD bagi Manager untuk mengelola daftar jabatan dinamis di perusahaan/tim.
* Autentikasi menggunakan Supabase Auth. Sesi dijaga menggunakan JWT dan Middleware Next.js.

### 3.2. Manager Dashboard
Halaman utama bagi Manager setelah login:
* **Ringkasan Metrik:** Jumlah Task Aktif, Subtask Selesai, dan Subtask Overdue.
* **Perhatian Mendesak:** Daftar Subtask ($\le$ H-3).
* **Beban Kerja Anggota:** Visualisasi beban kerja tim secara real-time.

### 3.3. Manajemen Task & Subtask
* **Task (Parent):** Payung pekerjaan (Judul, Deskripsi, Status, ID Pembuat).
* **Subtask (Child):** Rincian pekerjaan dengan Assignee, Deadline Tanggal, Deadline Jam, dan Status Penyelesaian.

### 3.4. Tampilan Kalender & Logika H-3 
* Visualisasi kalender bulanan/mingguan responsif.
* **Logika H-3:** Warna background elemen subtask berubah (muted warning color) jika deadline $\le$ 3 hari dan belum selesai.
* Modal interaktif saat item kalender diklik.

---

## 4. Kebutuhan Non-Fungsional & UI/UX Guidelines
* **Mobile Responsiveness (Wajib):** Seluruh elemen mulai dari Dashboard, Form, Tabel, hingga Kalender harus memiliki *layout breakpoint* yang beradaptasi dengan sempurna pada layar *smartphone*. Navigasi diubah menjadi *hamburger menu* atau *bottom navigation bar* pada layar kecil. Interaksi sentuh (touch-friendly) pada elemen kalender sangat diutamakan.
* **Estetika Desain:** Minimalis, bersih, modern, dan elegan (dark mode dominan).
* **Whitespace:** Penataan komponen memberikan ruang bernapas yang cukup antar kartu, tabel, dan elemen kalender, baik di tampilan desktop maupun mobile, untuk menghindari antarmuka yang sesak.

---

## 5. Arsitektur Teknis & Tech Stack
* **Frontend:** Next.js (React) dengan App Router.
* **Styling:** Tailwind CSS (sangat optimal untuk mengelola *responsive utilities* seperti `md:`, `lg:` dan *dark mode* dinamis).
* **Backend & Database:** Supabase (PostgreSQL, Auth, RLS).
* **Calendar Library:** FullCalendar (React Wrapper) - mendukung *view* responsif untuk mobile.

---

## 6. Struktur Skema Database (Database Schema)

### 6.1. Tabel `master_job_titles` (Master Jabatan)
Menyimpan daftar jabatan yang dinamis dan dapat disesuaikan oleh atasan.
```sql
CREATE TABLE master_job_titles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6.2. Tabel `users`
Diperbarui dengan tambahan relasi ke `master_job_titles`.
```sql
CREATE TABLE users (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    system_role VARCHAR(50) CHECK (system_role IN ('manager', 'member')) NOT NULL,
    job_title_id INTEGER REFERENCES master_job_titles(id) NULL,
    manager_id UUID REFERENCES users(id) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6.3. Tabel `tasks` & `subtasks`
```sql
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE subtasks (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    assigned_to UUID REFERENCES users(id) NOT NULL,
    deadline_date DATE NOT NULL,
    deadline_time TIME NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6.4. Supabase RLS Policies
* **Tabel `master_job_titles`:** Hanya `system_role = 'manager'` yang bisa INSERT/UPDATE/DELETE. Semua user bisa SELECT.
* **Tabel `users`:** Hanya manager yang bisa INSERT user baru (menggunakan Supabase Admin API untuk _invite_ user).
* **Tabel `subtasks`:** Member hanya bisa UPDATE kolom `is_completed` pada row di mana `assigned_to = auth.uid()`.

---

## 7. Rencana Pengembangan (Development Plan)

* **Fase 1: Konfigurasi Database & Master Data (Minggu 1)**
    * Setup Supabase dan pembuatan seluruh tabel termasuk `master_job_titles`.
    * Implementasi RLS untuk memisahkan hak Manager dalam mengelola Master Data.
* **Fase 2: User Management & Autentikasi (Minggu 2)**
    * Membangun UI untuk Manager membuat Jabatan baru.
    * Membangun antarmuka "Invite Member" khusus Manager untuk menambahkan bawahan dan menetapkan jabatan mereka.
* **Fase 3: Task Flow & UI Mobile-Responsive (Minggu 3)**
    * Membangun fungsionalitas CRUD Task dan Subtask.
    * Menerapkan Tailwind utilites secara ketat untuk memastikan *form*, *tabel*, dan *dashboard* terlihat sempurna dan proporsional di layar mobile.
* **Fase 4: Kalender Dinamis & Testing (Minggu 4)**
    * Integrasi FullCalendar dengan optimasi *mobile view* (misal: beralih dari view grid bulanan ke view *list/agenda* di layar HP).
    * Implementasi logika H-3 warna peringatan.
    * End-to-End testing pada perangkat desktop dan mobile (simulator/real device).
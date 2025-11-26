---
marp: true
theme: default
paginate: true
backgroundColor: #fff
style: |
  section {
    font-family: 'Arial', sans-serif;
    font-size: 24px;
  }
  h1 {
    color: #2c3e50;
  }
  h2 {
    color: #34495e;
  }
  strong {
    color: #e74c3c;
  }
---

# Spec-kit Development
## The Future of AI-Driven Engineering

---

# Agenda

1. The Current State of AI Coding
2. The Problems with Current Methods
3. What is Spec-kit Development?
4. Anatomy of a Spec-kit
5. The Workflow
6. Comparison with Other Methods
7. Benefits & Challenges
8. Future Outlook

---

# The Current State of AI Coding

- **Chat-based (ChatGPT, Claude):**
  - Conversational, good for exploration.
  - "Copy-paste" workflow.
- **Autocomplete (Copilot, Codeium):**
  - "Ghost text" in your editor.
  - Fast, tactical, line-by-line assistance.
- **Agentic (Devin, AutoGPT):** <!-- Change tool -->
  - Autonomous, but often struggles with complex, unguided tasks.

---

# The Problem: Context Drift

- **The "Goldfish Memory" Effect:**
  - Long chat threads lose context.
  - AI forgets the database schema you mentioned 20 messages ago.
- **Fragmented Knowledge:**
  - Your IDE knows your files, but the Chatbot might not.
  - "Hallucinations" occur when context is missing.

---

# The Problem: Prompt Engineering Fatigue

- **The "Blank Page" Syndrome:**
  - Staring at a cursor, trying to craft the *perfect* prompt.
- **Inconsistency:**
  - Asking the same question twice yields different code styles.
- **Lack of Standards:**
  - Hard to enforce team coding standards via simple prompts.

---

# Enter: Spec-kit Development

**Definition:**
A methodology where software is built by providing an AI model with a comprehensive, structured **"Specification Kit"** *before* code generation begins.

> "Architecting the prompt, not just writing it."

---

# Core Concept: The "Kit"

The **Spec-kit** is a collection of files that serves as the **Single Source of Truth**.

It is **NOT** just a text prompt.
It **IS** a structured context package.

---

# Anatomy of a Spec-kit (1/4) "add example"
## 📄 Functional Requirements

- **User Stories:** "As a user, I want to..."
- **Acceptance Criteria:** "Verify that..."
- **Business Logic:** Rules for validation, calculations, and workflows.
- **Format:** Markdown, Gherkin syntax.

---

# Anatomy of a Spec-kit (2/4)
## 🔌 API doc & Schemas

- **Interfaces:** The "hard" constraints. "explain"
- **OpenAPI / Swagger:** Defines endpoints, inputs, and outputs strictly.
- **GraphQL Schemas:** Defines the data graph.
- **Protobuf / gRPC:** For microservices.

---

# Anatomy of a Spec-kit (3/4)
## 🗄️ Data Models

- **ER Diagrams:** Visual or text-based (Mermaid.js/PlantUML/DBML).
- **SQL Schemas:** `CREATE TABLE` statements.
- **JSON Schemas:** Structure of NoSQL documents.
- Prevents AI from inventing fields that don't exist.

---

# Anatomy of a Spec-kit (4/4)
## 🎨 Design & Constraints

- **Style:** Colors, spacing, typography (JSON/CSS variables).
- **Component Library:** List of available UI components (don't reinvent the button).
- **Tech Stack:** "Use React 18, TypeScript, Tailwind CSS".
- **Linting Rules:** `.eslintrc`, `.prettierrc`.

---

# The Workflow: Step 1 - Define

**Human Role:** Architect & Product Owner.

- Write the User Stories.
- Define the Data Model.
- Sketch the API Contract.
- *No coding yet.*

---

# The Workflow: Step 2 - Assemble

**Human Role:** Curator.

- Gather these documents into a folder (the `spec-kit`).
- Ensure documents don't contradict each other.
- This kit becomes the **Prompt Context**.

---

# The Workflow: Step 3 - Generate

**AI Role:** Builder.

- Feed the Spec-kit to the AI (LLM).
- Request: "Implement the feature defined in `story-101.md` using the schema in `db-schema.sql`."
- AI generates the code, tests, and documentation.

---

# The Workflow: Step 4 - Verify & Iterate

**Human Role:** Reviewer.

- Review the generated code against the Spec-kit.
- Run tests (which the AI also wrote based on the specs).
- **Refinement:** If code is wrong, *update the Spec-kit*, not just the code.

---

# Comparison: Spec-kit vs. Others

| Feature | 💬 Chat-driven | ⚡ Autocomplete | 📦 **Spec-kit** |
| :--- | :--- | :--- | :--- |
| **Input** | Natural Language | Code Context | Structured Specs |
| **Scope** | Snippets | Lines / Blocks | Modules / Features |
| **Context** | Ephemeral | Local (File) | **Persistent (Kit)** |
| **Consistency** | Low | Medium | **High** |

---

# Why is it Better? (Quality)

- **Deterministic Outputs:**
  - Strict inputs lead to strict outputs.
- **Reduced Hallucination:**
  - AI is grounded by the provided schemas.
- **"Shift Left":**
  - Bugs are caught in the *design phase* (conflicting specs) before code is written.

---

# Why is it Better? (Scalability)

- **Batch Generation:**
  - Generate Frontend, Backend, and Tests simultaneously using the same shared Spec-kit.
- **Onboarding:**
  - New developers (and new AI agents) can read the Spec-kit to understand the system immediately.

---

# Challenges & Limitations

- **Upfront Investment:**
  - Requires writing specs *before* coding. (The "Lazy Developer" problem).
- **Maintenance:**
  - The Spec-kit must be kept in sync with the code.
- **Complexity:**
  - Over-engineering the kit can lead to diminishing returns.

---

# Future Outlook

- **Auto-generated Kits:**
  - AI analyzing existing code to *create* the Spec-kit for you.
- **IDE Integration:**
  - "Spec-driven" IDEs where the spec is a first-class citizen.
- **Continuous Validation:**
  - CI/CD pipelines that check if code matches the Spec-kit.

---

# Conclusion

**Spec-kit Development** moves us from "Coding with AI" to **"Architecting for AI"**.

It empowers developers to focus on the **WHAT** (The Specification) and lets the AI handle the **HOW** (The Implementation).

**The code is temporary. The Specification is eternal.**


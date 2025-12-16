# **WEEK 3**

## **Feature F1 – Fuzzy Search Engine (Backend)**

**Description**  
Make the email search tolerant to typos and partial matches, instead of exact string matching.

**Definition of done**

* Implement a fuzzy search function that:

  * Searches over at least **subject** and **sender** (name or email).

  * (Optional) can also consider body/summary.

* Supports:

  * Typo tolerance

    * Example:  “marketing” → still finds emails about “marketing”.

  * Partial matches

    * Example: “Nguy”→ finds senders like “Nguyễn Văn A”, “nguyen@example.com\`.

* Returns results ranked by relevance (best matches first).

## **Feature F2 – Fuzzy Search UI (Frontend)**

**Description**  
Let the user type a query and see fuzzy search results as email cards.

**Definition of done**

* Add a search bar in the main UI (e.g., header).

  * Typing a query and pressing Enter calls the fuzzy search endpoint.

* Show a Search Results view:

  * Render a simple vertical list of cards (reuse existing card component).

  * Each card displays at least:

    * Sender

    * Subject

    * Short snippet/summary (if available)

    * A “View” button or link.

* Handle basic UX states:

  * Loading indicator while the request is in progress.

  * “No results found” message when the list is empty.

  * A simple error message if the request fails.

* Provide a clear way to return to the normal Gmail/Kanban view:

  * e.g., Back button, “Clear search”, or closing the search view.

## **Feature F3 – Filtering & Sorting on Kanban Board** 

**Description**

Implement simple sorting and filtering controls that apply to cards within Kanban columns.

**Definition of Done**

* **Sorting Controls**

  * At least two sorting options, for example:

    * Date: Newest first

    * Date: Oldest first

    * (Optional alternative: sort by sender name)

  * Sorting applies within each column (Inbox, To Do, etc.) and clearly changes the order of cards.

* **Filtering Controls**

  * A small filter bar or controls that allow users to:

    * “Show only Unread”

    * “Show only emails with Attachments”

    * (Or another simple filter like “From \[specific sender\]”)

  * When filters are enabled, only matching cards are visible in the columns.

* **Real-time Update**

  * Changes in sort/filter apply immediately on the UI (no full page reload required).

  * Turning filters off restores the full list of cards in that column.

## **Grading**

| Feature | Criteria | Points |
| :---- | :---- | :---- |
| F1 – Fuzzy Search Engine (BE) | \-  Fuzzy logic correctly handles typos and partial matches on subject/sender;  \-  Results are ranked sensibly;  \-  Demo queries show clear non-exact matches. | 30 |
| F2 – Fuzzy Search UI (FE) | \-  Search bar is integrated;  \-  Calls fuzzy endpoint;  \- Results displayed as cards with sender, subject, snippet, and “View/Open”;  \-  Loading/empty/error states handled; easy navigation back to main view. | 30 |
| F3 – Filtering & Sorting  | \- At least two sort options and at least one filter type work correctly on Kanban columns;  \- Changes apply in real time without reload;  \- Turning filters on/off behaves as expected. | 30 |
| Coding Quality, Demo & Deploy | \- Code is clean and readable \- There is a clear demo flow \- App is deployed | 10 |
| **Total** |  | 100 |

## 
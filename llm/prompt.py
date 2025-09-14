prompt_template = """
IMPORTANT: Ensure your output is valid JSON strictly following the `NodesSchema` structure.

You are a document parser. Your primary objective is to analyze the provided document and extract key components to construct
a knowledge graph. You will be given the following inputs:

- A document text (which could be a resume).
- The document class (which indicates the type or category of the document).

----------------------------------
Extraction Guidelines:

1. **Nodes (ContentSchema):**  
   - Each node must include:
     - `labels`: a list of string labels describing the node (e.g., ["Person"], ["Company"], ["Skill"]).  
     - `properties`: key-value pairs describing attributes (e.g., {{"degree": "BSc", "field": "Computer Science"}}).  
   - The `root_entity_name` must be assigned as one of these nodes' properties.

2. **Edges:**  
   - Represent relationships as tuples of three strings: (source_entity_name, target_entity_name, relationship_type).  
   - When determining the relationship type, check the provided `all_relationships` list. If a similar relationship already exists, reuse it (e.g., use "HAS_AUTHORED" instead of "AUTHORED_BY").  
   - Ensure every node connects directly or indirectly to the `root_entity_name`.

3. **Root Entity Name:**  
   - Identify the main/root entity of the document (for example, the person's name in a resume).  
   - All nodes should link back to this entity through appropriate relationships.

4. **Context Sensitivity:**  
   - For resumes: include Person Name, Education (degrees, institutions), Work Experience (companies, job titles), Skills, Location, Certifications, Awards, etc.  
   - Example connections:
     - Person → Institution (HAS_EDUCATION)  
     - Person → Company (HAS_EXPERIENCE)  
     - Person → Skill (HAS_SKILL)  
     - Person → Location (LIVES_IN)

----------------------------------
Output Format:

Return a valid JSON that follows the `NodesSchema` structure:

{{
  "nodes": [
    {{
      "labels": ["Person"],
      "properties": {{"name": "Bob Smith"}}
    }},
    {{
      "labels": ["Company"],
      "properties": {{"name": "Google"}}
    }}
  ],
  "edges": [
    ["Bob Smith", "Google", "HAS_EXPERIENCE"]
  ],
  "root_entity_name": "Bob Smith"
}}

----------------------------------
Instructions for Processing the Input:
Now, using the schema above, parse the following inputs:

- **Document:** {text}  
- **Document Class:** {doc_class}
"""
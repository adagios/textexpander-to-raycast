import fg from 'npm:fast-glob';
import xml2js from 'npm:xml2js';

const files = await fg('*.textexpbackup');

console.log(`Found ${files.length} TextExpander Backup Files!`);

type TextExpanderSnippet = {
  key: string[];
  string: [expansion: string, description: string, snippetValue: string]
}

type RaycastSnippet = {
  name: string;
  text: string;
  keyword?: string;
}

function convertToRaycast(snippet: TextExpanderSnippet): RaycastSnippet | undefined {
  const expansion = snippet.string.at(0);
  const description = snippet.string.at(1);
  const snippetValue = snippet.string.at(2);
  if (!expansion || !snippetValue) {
    console.warn('Skipping this snippet because it doesnt have an expansion or value', {
      expansion, snippetValue
    });
    return;
  }
  const result = {
    name: description || expansion, // description → Name, or expansion → Name
    keyword: expansion, // expansion → Keyword
    text: snippetValue, // Snippet Value → Text
  }

  if (snippet.dict.at(0).key === "RTF") {
    console.log('Found RTF');
    result.richText = snippet.dict.at(0).string;
  }
  console.log('Converting', snippet.string);
  return result;
}

// loop over each file, read the contents, and convert to json
const groups = await Promise.all(files.toSorted().slice(0, 1).map(async (file) => {
  console.log(`Chose ${file}`);
  const xml = await Deno.readTextFile(file);
  const json = await xml2js.parseStringPromise(xml, { explicitArray: false });

  return json.plist.dict.array.at(3).dict as TextExpanderSnippet[];
}))

const snippets = groups.flat().filter(Boolean);

const raycastSnippets = snippets.map(convertToRaycast).filter(Boolean);

console.log(`Converted ${raycastSnippets.length} Snippets to Raycast`);
await Deno.writeFile('snippets.json', new TextEncoder().encode(JSON.stringify(raycastSnippets, null, 2)));

console.log(`Your file now lives at ${Deno.cwd()}/snippets.json. Go ahead and import it into Raycast:`);

import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";
import { resolveTextInput } from "../lib/json-input.js";

export function registerDatasetCommands(program: Command, auth: DomoAuth): void {
  const dataset = program.command("dataset").description("Dataset operations");

  dataset
    .command("list")
    .description("List datasets in the Domo instance")
    .option("--limit <n>", "Max datasets to return (default 50, max 50)", "50")
    .option("--offset <n>", "Pagination offset", "0")
    .option("--name-contains <text>", "Filter by name substring")
    .action(async (opts) => {
      const params = new URLSearchParams({
        limit: String(Math.min(Number(opts.limit), 50)),
        offset: opts.offset,
      });
      if (opts.nameContains) params.set("nameLike", opts.nameContains);
      const res = await auth.fetch(`/api/data/v3/datasources?${params}`);
      await output(res, (data: unknown) => (data as { dataSources: unknown[] }).dataSources);
    });

  dataset
    .command("get <datasetId>")
    .description("Get dataset metadata: schema, row count, owner, last updated")
    .action(async (datasetId: string) => {
      const res = await auth.fetch(`/api/data/v3/datasources/${datasetId}`);
      await output(res);
    });

  dataset
    .command("schema <datasetId>")
    .description("Get the full column schema for a dataset")
    .action(async (datasetId: string) => {
      const res = await auth.fetch(`/api/data/v3/datasources/${datasetId}/schema`);
      await output(res, (data: unknown) => {
        const d = data as { schemaContract?: { schema?: { columns?: unknown[] } } };
        return d.schemaContract?.schema?.columns ?? [];
      });
    });

  dataset
    .command("query <datasetId> <sql>")
    .description("Run a SQL query against a dataset (use 'table' as the table name)")
    .action(async (datasetId: string, sql: string) => {
      const res = await auth.fetch(`/api/query/v1/execute/${datasetId}`, {
        method: "POST",
        body: JSON.stringify({ sql }),
      });
      await output(res);
    });

  dataset
    .command("create")
    .description("Create a new empty dataset with a specified schema")
    .requiredOption("--name <name>", "Dataset name")
    .option("--description <text>", "Dataset description")
    .requiredOption("--columns <json>", "JSON array of column defs: [{\"name\":\"Col1\",\"type\":\"STRING\"}]")
    .action(async (opts) => {
      const schema = { columns: JSON.parse(opts.columns) };
      const res = await auth.fetch("/api/data/v2/datasources", {
        method: "POST",
        body: JSON.stringify({ dataSourceName: opts.name, description: opts.description, schema }),
      });
      await output(res);
    });

  dataset
    .command("upload <datasetId>")
    .description("Upload CSV data into an existing dataset (init → upload → commit → index)")
    .option("--csv-data <csv>", "CSV string with header row and data rows")
    .option("--csv-file <path>", "Path to a CSV file")
    .option("--update-method <method>", "REPLACE (default) or APPEND", "REPLACE")
    .action(async (datasetId: string, opts) => {
      const csvData = resolveTextInput(opts.csvData, opts.csvFile);
      const updateMethod = opts.updateMethod;

      // Step 1: Get streamId
      let dsRes = await auth.fetch(`/api/data/v3/datasources/${datasetId}`);
      let ds = (await dsRes.json()) as { streamId?: number };
      let streamId = ds.streamId;

      if (!streamId) {
        await auth.fetch(`/api/data/v3/datasources/${datasetId}/uploads/`, { method: "POST" });
        dsRes = await auth.fetch(`/api/data/v3/datasources/${datasetId}`);
        ds = (await dsRes.json()) as { streamId?: number };
        streamId = ds.streamId;
      }
      if (!streamId) {
        console.error(JSON.stringify({ error: true, message: `No streamId found for dataset ${datasetId}.` }, null, 2));
        process.exit(1);
      }

      // Step 2: Create execution
      const execRes = await auth.fetch(`/api/data/v1/streams/${streamId}/executions`, {
        method: "POST",
        body: JSON.stringify({ updateMethod }),
      });
      if (!execRes.ok) {
        console.error(JSON.stringify({ error: true, status: execRes.status, message: await execRes.text() }, null, 2));
        process.exit(1);
      }
      const exec = (await execRes.json()) as { executionId: number };
      const execId = exec.executionId;

      // Step 3: Upload parts (~10MB chunks)
      const PART_SIZE = 10 * 1024 * 1024;
      const csvBytes = new TextEncoder().encode(csvData);
      const totalParts = Math.max(1, Math.ceil(csvBytes.length / PART_SIZE));

      for (let partNum = 1; partNum <= totalParts; partNum++) {
        const start = (partNum - 1) * PART_SIZE;
        const end = Math.min(partNum * PART_SIZE, csvBytes.length);
        const partData = new TextDecoder().decode(csvBytes.slice(start, end));

        const partRes = await auth.fetch(
          `/api/data/v1/streams/${streamId}/executions/${execId}/part/${partNum}`,
          { method: "PUT", headers: { "Content-Type": "text/csv" }, body: partData }
        );
        if (!partRes.ok) {
          console.error(JSON.stringify({ error: true, status: partRes.status, message: `Part ${partNum}/${totalParts} failed: ${await partRes.text()}` }, null, 2));
          process.exit(1);
        }
      }

      // Step 4: Commit
      const commitRes = await auth.fetch(
        `/api/data/v1/streams/${streamId}/executions/${execId}/commit`,
        { method: "PUT" }
      );
      if (!commitRes.ok) {
        console.error(JSON.stringify({ error: true, status: commitRes.status, message: `Commit failed: ${await commitRes.text()}` }, null, 2));
        process.exit(1);
      }

      // Step 5: Index
      await auth.fetch(`/api/data/v3/datasources/${datasetId}/indexes`, {
        method: "POST",
        body: "{}",
      });

      console.log(JSON.stringify({
        success: true, datasetId, executionId: execId, streamId,
        parts: totalParts, bytes: csvBytes.length, method: updateMethod, indexed: true,
      }, null, 2));
    });

  dataset
    .command("create-with-data")
    .description("Create a new dataset AND populate it with CSV data in one operation")
    .requiredOption("--name <name>", "Dataset name")
    .option("--description <text>", "Dataset description")
    .requiredOption("--columns <json>", "JSON array of column defs")
    .option("--csv-data <csv>", "CSV string with header row and data rows")
    .option("--csv-file <path>", "Path to a CSV file")
    .action(async (opts) => {
      const csvData = resolveTextInput(opts.csvData, opts.csvFile);
      const schema = { columns: JSON.parse(opts.columns) };

      // Step 1: Create dataset
      const createRes = await auth.fetch("/api/data/v2/datasources", {
        method: "POST",
        body: JSON.stringify({ dataSourceName: opts.name, description: opts.description, schema }),
      });
      if (!createRes.ok) {
        console.error(JSON.stringify({ error: true, status: createRes.status, message: await createRes.text() }, null, 2));
        process.exit(1);
      }
      const created = (await createRes.json()) as { dataSource?: { dataSourceId: string } };
      const datasetId = created.dataSource?.dataSourceId;

      // Step 2: Init upload
      const initRes = await auth.fetch(`/api/data/v3/datasources/${datasetId}/uploads/`, { method: "POST" });
      if (!initRes.ok) {
        console.error(JSON.stringify({ error: true, message: `Created ${datasetId} but upload init failed: ${await initRes.text()}` }, null, 2));
        process.exit(1);
      }
      const upload = (await initRes.json()) as { uploadId: number };

      // Step 3: Get streamId
      const dsRes = await auth.fetch(`/api/data/v3/datasources/${datasetId}`);
      const ds = (await dsRes.json()) as { streamId: number };

      // Step 4: Upload CSV
      const partRes = await auth.fetch(
        `/api/data/v3/datasources/${datasetId}/uploads/${upload.uploadId}/parts/1`,
        { method: "PUT", headers: { "Content-Type": "text/csv" }, body: csvData }
      );
      if (!partRes.ok) {
        console.error(JSON.stringify({ error: true, message: `Created ${datasetId} but upload failed: ${await partRes.text()}` }, null, 2));
        process.exit(1);
      }

      // Step 5: Commit
      await auth.fetch(
        `/api/data/v1/streams/${ds.streamId}/executions/${upload.uploadId}/commit`,
        { method: "PUT" }
      );

      // Step 6: Index
      await auth.fetch(`/api/data/v3/datasources/${datasetId}/indexes`, {
        method: "POST",
        body: "{}",
      });

      const rowCount = csvData.split("\n").filter(line => line.trim()).length - 1;
      console.log(JSON.stringify({
        success: true, datasetId, name: opts.name, streamId: ds.streamId,
        estimatedRows: rowCount, indexed: true,
        note: "Data will be queryable within ~10-15 seconds.",
      }, null, 2));
    });

  // Search is a top-level command but grouped here with data
  program
    .command("search <query>")
    .description("Search across Domo for datasets, cards, pages, and other entities")
    .option("--entities <types>", "Comma-separated entity types: CARD, PAGE, DATASET", "CARD,PAGE,DATASET")
    .option("--limit <n>", "Max results (default 20)", "20")
    .action(async (query: string, opts) => {
      const entityTypes = opts.entities.split(",").map((e: string) => e.trim());
      const params = new URLSearchParams({ q: query, limit: opts.limit });
      for (const e of entityTypes) params.append("entity", e);

      const res = await auth.fetch(`/api/search/v1/query?${params}`);
      await output(res);
    });
}

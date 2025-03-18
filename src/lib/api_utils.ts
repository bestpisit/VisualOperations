export function getSearchParams(req: Request): URLSearchParams {
    const reqUrl = req.url;
    const { searchParams } = new URL(reqUrl);
    return searchParams;
}
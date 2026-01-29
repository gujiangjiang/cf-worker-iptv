/**
 * 工具模块
 * 功能：提供 CORS 头、鉴权函数、通用响应辅助函数
 */

// 通用跨域头配置
export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * 统一鉴权函数
 * @param {Request} request 
 * @param {Object} env 
 * @returns {boolean}
 */
export const checkAuth = (request, env) => {
    const auth = request.headers.get("Authorization");
    return auth === env.PASSWORD;
};

/**
 * 生成 JSON 响应
 * @param {Object} data 
 * @param {number} status 
 * @returns {Response}
 */
export const jsonResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
};

/**
 * 生成错误响应
 * @param {string} message 
 * @param {number} status 
 * @returns {Response}
 */
export const errorResponse = (message, status = 400) => {
    return new Response(message, { status: status, headers: corsHeaders });
};
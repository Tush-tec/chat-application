


class ApiResponse {
    constructor(
        statusCode, 
        data,
        message = "success"
    ){ 
        this.statusCode =statusCode
        this.data =data
        this.message=message
        this.success =statusCode < 400 // Cause this is an Api Response// this succes code between InformationRepsonse(100-199), SuccessFullResponse(200-299), RedirectionMessage(300-399). All above code are error code that is Client Error Response (400-499), ServerResposneError(500-599)
    }
}



export {ApiResponse}

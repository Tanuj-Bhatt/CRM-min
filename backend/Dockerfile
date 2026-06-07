# Use the official .NET SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy solution file and package references
COPY CRM.slnx ./
COPY src/CRM.API/CRM.API.csproj src/CRM.API/
COPY src/CRM.Business/CRM.Business.csproj src/CRM.Business/
COPY src/CRM.DataProvider/CRM.DataProvider.csproj src/CRM.DataProvider/
COPY src/CRM.IDataProvider/CRM.IDataProvider.csproj src/CRM.IDataProvider/
COPY src/CRM.Model/CRM.Model.csproj src/CRM.Model/

# Restore dependencies
RUN dotnet restore src/CRM.API/CRM.API.csproj

# Copy all source files and build the release
COPY . ./
RUN dotnet publish src/CRM.API/CRM.API.csproj -c Release -o out

# Build the runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/out .

# Expose the port the app runs on
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "CRM.API.dll"]

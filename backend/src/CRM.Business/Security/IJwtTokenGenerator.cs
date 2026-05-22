using CRM.Model.Entities;

namespace CRM.Business.Security;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
}
